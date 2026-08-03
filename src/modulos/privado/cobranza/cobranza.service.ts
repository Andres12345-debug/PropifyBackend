import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource, In, LessThan, Not, Repository } from 'typeorm';

import { Residente } from 'src/modelos/residente/residente';
import {
  CuentaMensual,
  EstadoCuenta,
} from 'src/modelos/cuenta-mensual/cuenta-mensual';
import {
  CargoDetalle,
  TipoCargo,
} from 'src/modelos/cargo-detalle/cargo-detalle';
import { Pago } from 'src/modelos/pago/pago';
import { Reserva, EstadoReserva } from 'src/modelos/reserva/reserva';
import { Unidad } from 'src/modelos/unidad/unidad';
import { Inmueble } from 'src/modelos/inmueble/inmueble';
import { Usuario } from 'src/modelos/usuario/usuario';
import { Rol } from 'src/modelos/rol/rol';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import {
  CanalNotificacion,
  TipoNotificacion,
} from 'src/modelos/notificacion-enviada/notificacion-enviada';
import { RoleNames, obtenerTenantId } from 'src/middleware/seguridad/rol.helper';
import { verificarTenant } from 'src/middleware/seguridad/tenant.helper';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

export interface CuentaResumen {
  codCuenta: number;
  periodo: string;
  fechaVencimiento: Date;
  total: number;
  totalPagado: number;
  estado: EstadoCuenta;
  codResidente: number;
  nombreResidente: string;
  identificadorUnidad: string;
  codInmueble: number;
  nombreInmueble: string;
}

export interface ConsultarCuentasFiltros {
  estado?: EstadoCuenta;
  inmuebleId?: number;
}

const DIAS_AVISO_RECORDATORIO = 3;

// Exportado: el Dashboard (ResidentesService.consultarPorVencer) usa la
// misma ventana para mostrar la lista de contratos por vencer.
export const DIAS_AVISO_VENCIMIENTO_CONTRATO = 15;

export function periodoDe(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

export function esFinDeSemana(fecha: Date): boolean {
  const dia = fecha.getDay();
  return dia === 0 || dia === 6;
}

// Ajusta al primer día hábil siguiente si el día de pago cae en fin de
// semana (spec §4.1: "hoy es el diaPago o el primer día hábil después").
export function calcularFechaVencimiento(hoy: Date, diaPago: number): Date {
  const diasEnMes = new Date(
    hoy.getFullYear(),
    hoy.getMonth() + 1,
    0,
  ).getDate();
  const dia = Math.min(diaPago, diasEnMes);
  const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), dia);
  while (esFinDeSemana(fecha)) {
    fecha.setDate(fecha.getDate() + 1);
  }
  return fecha;
}

export function esMismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

@Injectable()
export class CobranzaService {
  private readonly logger = new Logger(CobranzaService.name);

  private residenteRepository: Repository<Residente>;
  private cuentaRepository: Repository<CuentaMensual>;
  private cargoRepository: Repository<CargoDetalle>;
  private pagoRepository: Repository<Pago>;
  private reservaRepository: Repository<Reserva>;
  private unidadRepository: Repository<Unidad>;
  private inmuebleRepository: Repository<Inmueble>;
  private usuarioRepository: Repository<Usuario>;
  private rolRepository: Repository<Rol>;

  constructor(
    private readonly poolConexion: DataSource,
    private readonly notificacionesService: NotificacionesService,
  ) {
    this.residenteRepository = poolConexion.getRepository(Residente);
    this.cuentaRepository = poolConexion.getRepository(CuentaMensual);
    this.cargoRepository = poolConexion.getRepository(CargoDetalle);
    this.pagoRepository = poolConexion.getRepository(Pago);
    this.reservaRepository = poolConexion.getRepository(Reserva);
    this.unidadRepository = poolConexion.getRepository(Unidad);
    this.inmuebleRepository = poolConexion.getRepository(Inmueble);
    this.usuarioRepository = poolConexion.getRepository(Usuario);
    this.rolRepository = poolConexion.getRepository(Rol);
  }

  // Corre una sola vez al día, 6am hora del servidor (spec §4). Sin
  // argumento procesa TODOS los tenants — así debe correr el cron real.
  @Cron('0 6 * * *')
  public async ejecutarCobranzaDiaria(codTenant?: number): Promise<void> {
    this.logger.log(
      codTenant
        ? `Iniciando ciclo de cobranza diaria (tenant ${codTenant})`
        : 'Iniciando ciclo de cobranza diaria (todos los tenants)',
    );
    const hoy = new Date();

    await this.generarCuentasDelPeriodo(hoy, codTenant);
    await this.actualizarCuentasVencidas(hoy, codTenant);
    await this.enviarRecordatorios(hoy, codTenant);
    await this.enviarAvisosMora(codTenant);
    await this.enviarAvisosVencimientoContrato(hoy, codTenant);

    this.logger.log('Ciclo de cobranza diaria finalizado');
  }

  // Sin esto, POST /privado/cobranza/ejecutar corría el ciclo para TODA la
  // plataforma sin importar qué tenant lo invocara — cualquier dueño podía
  // generar cuentas y disparar notificaciones de otros tenants.
  private async obtenerResidentesActivos(
    codTenant?: number,
  ): Promise<Residente[]> {
    const query = this.residenteRepository
      .createQueryBuilder('residente')
      .where('residente.activo = true');
    if (codTenant) {
      query
        .innerJoin(
          'unidades',
          'unidad',
          'unidad.cod_unidad = residente.cod_unidad',
        )
        .innerJoin(
          'inmuebles',
          'inmueble',
          'inmueble.cod_inmueble = unidad.cod_inmueble',
        )
        .andWhere('inmueble.cod_tenant = :codTenant', { codTenant });
    }
    return query.getMany();
  }

  private async obtenerCodResidentesDelTenant(
    codTenant: number,
  ): Promise<number[]> {
    const filas = await this.residenteRepository
      .createQueryBuilder('residente')
      .innerJoin(
        'unidades',
        'unidad',
        'unidad.cod_unidad = residente.cod_unidad',
      )
      .innerJoin(
        'inmuebles',
        'inmueble',
        'inmueble.cod_inmueble = unidad.cod_inmueble',
      )
      .where('inmueble.cod_tenant = :codTenant', { codTenant })
      .select('residente.cod_residente', 'codResidente')
      .getRawMany<{ codResidente: number }>();
    return filas.map((fila) => fila.codResidente);
  }

  private async generarCuentasDelPeriodo(
    hoy: Date,
    codTenant?: number,
  ): Promise<void> {
    const periodo = periodoDe(hoy);
    const residentesActivos = await this.obtenerResidentesActivos(codTenant);

    for (const residente of residentesActivos) {
      // Aísla cada residente: un error en uno (p. ej. una carrera con el
      // constraint único de (codResidente, periodo) si el cron y el
      // disparo manual coinciden) no debe abortar el resto del lote —
      // antes, una excepción a mitad del for...of dejaba sin cuenta al
      // resto de residentes ese día, sin reintento posterior.
      try {
        await this.generarCuentaDeResidente(residente, hoy, periodo);
      } catch (error) {
        this.logger.error(
          `Error generando cuenta para residente ${residente.codResidente}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  private async generarCuentaDeResidente(
    residente: Residente,
    hoy: Date,
    periodo: string,
  ): Promise<void> {
    const fechaVencimiento = calcularFechaVencimiento(hoy, residente.diaPago);
    if (!esMismoDia(fechaVencimiento, hoy)) {
      return;
    }

    const yaExiste = await this.cuentaRepository.findOne({
      where: { codResidente: residente.codResidente, periodo },
    });
    if (yaExiste) {
      return;
    }

    const nuevaCuenta = await this.cuentaRepository.save(
      this.cuentaRepository.create({
        codResidente: residente.codResidente,
        periodo,
        fechaVencimiento,
        total: 0,
        estado: EstadoCuenta.PENDIENTE,
      }),
    );

    let total = 0;

    const cargoCuota = await this.cargoRepository.save(
      this.cargoRepository.create({
        codCuenta: nuevaCuenta.codCuenta,
        concepto: residente.esPropietario
          ? 'Cuota de administración'
          : 'Arriendo mensual',
        monto: residente.valorMensual,
        tipo: residente.esPropietario
          ? TipoCargo.CUOTA_ADMINISTRACION
          : TipoCargo.ARRIENDO,
      }),
    );
    total += Number(cargoCuota.monto);

    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(
      hoy.getFullYear(),
      hoy.getMonth() + 1,
      0,
      23,
      59,
      59,
    );
    const reservasSinFacturar = await this.reservaRepository.find({
      where: {
        codResidente: residente.codResidente,
        estado: EstadoReserva.CONFIRMADA,
        facturada: false,
      },
    });
    for (const reserva of reservasSinFacturar) {
      if (reserva.fecha < inicioMes || reserva.fecha > finMes) {
        continue;
      }
      await this.cargoRepository.save(
        this.cargoRepository.create({
          codCuenta: nuevaCuenta.codCuenta,
          concepto: 'Reserva de zona común',
          monto: reserva.costo,
          tipo: TipoCargo.RESERVA_ZONA,
        }),
      );
      total += Number(reserva.costo);
      await this.reservaRepository.update(reserva.codReserva, {
        facturada: true,
      });
    }

    await this.cuentaRepository.update(nuevaCuenta.codCuenta, { total });
    this.logger.log(
      `Cuenta generada: residente ${residente.codResidente}, periodo ${periodo}, total ${total}`,
    );
  }

  private async actualizarCuentasVencidas(
    hoy: Date,
    codTenant?: number,
  ): Promise<void> {
    if (codTenant) {
      const codResidentes = await this.obtenerCodResidentesDelTenant(codTenant);
      if (codResidentes.length === 0) return;
      await this.cuentaRepository.update(
        {
          codResidente: In(codResidentes),
          fechaVencimiento: LessThan(hoy),
          estado: Not(EstadoCuenta.PAGADA),
        },
        { estado: EstadoCuenta.VENCIDA },
      );
      return;
    }

    await this.cuentaRepository.update(
      {
        fechaVencimiento: LessThan(hoy),
        estado: Not(EstadoCuenta.PAGADA),
      },
      { estado: EstadoCuenta.VENCIDA },
    );
  }

  private async enviarRecordatorios(
    hoy: Date,
    codTenant?: number,
  ): Promise<void> {
    const codResidentes = codTenant
      ? await this.obtenerCodResidentesDelTenant(codTenant)
      : undefined;
    if (codResidentes && codResidentes.length === 0) return;

    const cuentasPendientes = await this.cuentaRepository.find({
      where: {
        estado: EstadoCuenta.PENDIENTE,
        ...(codResidentes ? { codResidente: In(codResidentes) } : {}),
      },
    });

    for (const cuenta of cuentasPendientes) {
      try {
        await this.enviarRecordatorioDeCuenta(cuenta, hoy);
      } catch (error) {
        this.logger.error(
          `Error enviando recordatorio para cuenta ${cuenta.codCuenta}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  private async enviarRecordatorioDeCuenta(
    cuenta: CuentaMensual,
    hoy: Date,
  ): Promise<void> {
    const diasParaVencer = Math.round(
      (cuenta.fechaVencimiento.getTime() - hoy.getTime()) /
        (24 * 60 * 60 * 1000),
    );
    if (diasParaVencer !== DIAS_AVISO_RECORDATORIO) {
      return;
    }

    const yaEnviado = await this.notificacionesService.yaSeEnvioHoy(
      cuenta.codCuenta,
      TipoNotificacion.RECORDATORIO_PAGO,
    );
    if (yaEnviado) {
      return;
    }

    const residente = await this.residenteRepository.findOneBy({
      codResidente: cuenta.codResidente,
    });
    if (!residente) return;

    const mensaje = `Recordatorio: tu cuenta de ${cuenta.periodo} por $${cuenta.total} vence el ${cuenta.fechaVencimiento.toLocaleDateString()}.`;

    await this.notificacionesService.enviar(
      TipoNotificacion.RECORDATORIO_PAGO,
      residente.telefono,
      mensaje,
      cuenta.codCuenta,
    );

    if (residente.correo) {
      await this.notificacionesService.enviar(
        TipoNotificacion.RECORDATORIO_PAGO,
        residente.correo,
        mensaje,
        cuenta.codCuenta,
        CanalNotificacion.EMAIL,
      );
    }
  }

  private async enviarAvisosMora(codTenant?: number): Promise<void> {
    const codResidentes = codTenant
      ? await this.obtenerCodResidentesDelTenant(codTenant)
      : undefined;
    if (codResidentes && codResidentes.length === 0) return;

    const cuentasVencidas = await this.cuentaRepository.find({
      where: {
        estado: EstadoCuenta.VENCIDA,
        ...(codResidentes ? { codResidente: In(codResidentes) } : {}),
      },
    });

    for (const cuenta of cuentasVencidas) {
      try {
        await this.enviarAvisoMoraDeCuenta(cuenta);
      } catch (error) {
        this.logger.error(
          `Error enviando aviso de mora para cuenta ${cuenta.codCuenta}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  private async enviarAvisoMoraDeCuenta(cuenta: CuentaMensual): Promise<void> {
    const yaEnviado = await this.notificacionesService.yaSeEnvioHoy(
      cuenta.codCuenta,
      TipoNotificacion.MORA,
    );
    if (yaEnviado) {
      return;
    }

    const residente = await this.residenteRepository.findOneBy({
      codResidente: cuenta.codResidente,
    });
    if (!residente) return;

    const mensaje = `Tu cuenta de ${cuenta.periodo} está vencida. Total adeudado: $${cuenta.total}.`;

    await this.notificacionesService.enviar(
      TipoNotificacion.MORA,
      residente.telefono,
      mensaje,
      cuenta.codCuenta,
    );

    if (residente.correo) {
      await this.notificacionesService.enviar(
        TipoNotificacion.MORA,
        residente.correo,
        mensaje,
        cuenta.codCuenta,
        CanalNotificacion.EMAIL,
      );
    }
  }

  // Avisa al dueño (no al residente) cuando falta poco para que un
  // contrato/arriendo termine — aplica igual sin importar si el inmueble es
  // casa, edificio, conjunto o tiene locales: la fecha vive en el
  // Residente, no en el tipo de inmueble.
  private async enviarAvisosVencimientoContrato(
    hoy: Date,
    codTenant?: number,
  ): Promise<void> {
    const residentesActivos = await this.obtenerResidentesActivos(codTenant);

    for (const residente of residentesActivos) {
      if (!residente.fechaFin) continue;
      try {
        await this.procesarVencimientoContrato(residente, hoy);
      } catch (error) {
        this.logger.error(
          `Error procesando vencimiento de contrato para residente ${residente.codResidente}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  private async procesarVencimientoContrato(
    residente: Residente,
    hoy: Date,
  ): Promise<void> {
    const diasParaVencer = Math.round(
      (residente.fechaFin!.getTime() - hoy.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (diasParaVencer !== DIAS_AVISO_VENCIMIENTO_CONTRATO) {
      return;
    }

    const yaEnviado = await this.notificacionesService.yaSeEnvioHoyResidente(
      residente.codResidente,
      TipoNotificacion.VENCIMIENTO_CONTRATO,
    );
    if (yaEnviado) {
      return;
    }

    const unidad = await this.unidadRepository.findOneBy({
      codUnidad: residente.codUnidad,
    });
    if (!unidad) return;

    const inmueble = await this.inmuebleRepository.findOneBy({
      codInmueble: unidad.codInmueble,
    });
    if (!inmueble) return;

    const dueno = await this.obtenerDuenoDelTenant(inmueble.codTenant);
    if (!dueno?.correoUsuario) return;

    await this.notificacionesService.enviar(
      TipoNotificacion.VENCIMIENTO_CONTRATO,
      dueno.correoUsuario,
      `El contrato de ${residente.nombre} (unidad ${unidad.identificador}) vence el ${residente.fechaFin!.toLocaleDateString()}. Quedan ${DIAS_AVISO_VENCIMIENTO_CONTRATO} días.`,
      undefined,
      CanalNotificacion.EMAIL,
      residente.codResidente,
    );
  }

  private async obtenerDuenoDelTenant(
    codTenant: number,
  ): Promise<Usuario | null> {
    const rolDueno = await this.rolRepository.findOne({
      where: { nombreRol: RoleNames.DUENO },
    });
    if (!rolDueno) return null;

    return this.usuarioRepository.findOne({
      where: { codTenant, codRol: rolDueno.codRol },
    });
  }

  // ------------------------------------------------------------------
  // API para el módulo de Cobranza en el frontend (listar cuentas del
  // tenant y registrar pagos manuales). Todo lo anterior en este archivo
  // es el motor del cron; esto es la parte "bajo demanda" del dueño.
  // ------------------------------------------------------------------

  public async consultarCuentas(
    filtros: ConsultarCuentasFiltros,
    datosUsuario: SesionUsuario,
  ): Promise<CuentaResumen[]> {
    const codTenant = obtenerTenantId(datosUsuario)!;

    const query = this.cuentaRepository
      .createQueryBuilder('cuenta')
      .innerJoin(
        'residentes',
        'residente',
        'residente.cod_residente = cuenta.cod_residente',
      )
      .innerJoin(
        'unidades',
        'unidad',
        'unidad.cod_unidad = residente.cod_unidad',
      )
      .innerJoin(
        'inmuebles',
        'inmueble',
        'inmueble.cod_inmueble = unidad.cod_inmueble',
      )
      .where('inmueble.cod_tenant = :codTenant', { codTenant })
      .select([
        'cuenta.cod_cuenta AS "codCuenta"',
        'cuenta.periodo AS periodo',
        'cuenta.fecha_vencimiento AS "fechaVencimiento"',
        'cuenta.total AS total',
        'cuenta.estado AS estado',
        'residente.cod_residente AS "codResidente"',
        'residente.nombre AS "nombreResidente"',
        'unidad.identificador AS "identificadorUnidad"',
        'inmueble.cod_inmueble AS "codInmueble"',
        'inmueble.nombre AS "nombreInmueble"',
      ])
      .orderBy('cuenta.fecha_vencimiento', 'ASC');

    if (filtros.estado) {
      query.andWhere('cuenta.estado = :estado', { estado: filtros.estado });
    }
    if (filtros.inmuebleId) {
      query.andWhere('inmueble.cod_inmueble = :inmuebleId', {
        inmuebleId: filtros.inmuebleId,
      });
    }

    const filas = await query.getRawMany<{
      codCuenta: number;
      periodo: string;
      fechaVencimiento: Date;
      total: string;
      estado: EstadoCuenta;
      codResidente: number;
      nombreResidente: string;
      identificadorUnidad: string;
      codInmueble: number;
      nombreInmueble: string;
    }>();

    if (filas.length === 0) {
      return [];
    }

    const pagosPorCuenta = await this.pagoRepository
      .createQueryBuilder('pago')
      .select('pago.cod_cuenta', 'codCuenta')
      .addSelect('SUM(pago.monto)', 'totalPagado')
      .where('pago.cod_cuenta IN (:...codCuentas)', {
        codCuentas: filas.map((fila) => fila.codCuenta),
      })
      .groupBy('pago.cod_cuenta')
      .getRawMany<{ codCuenta: number; totalPagado: string }>();

    const totalPagadoPorCuenta = new Map(
      pagosPorCuenta.map((fila) => [fila.codCuenta, Number(fila.totalPagado)]),
    );

    return filas.map((fila) => ({
      ...fila,
      total: Number(fila.total),
      totalPagado: totalPagadoPorCuenta.get(fila.codCuenta) ?? 0,
    }));
  }

  private async obtenerCuentaDelTenant(
    codCuenta: number,
    datosUsuario: SesionUsuario,
  ): Promise<CuentaMensual> {
    const cuenta = await this.cuentaRepository.findOneBy({ codCuenta });
    if (!cuenta) {
      throw new HttpException('Cuenta no encontrada', HttpStatus.NOT_FOUND);
    }

    const residente = await this.residenteRepository.findOneBy({
      codResidente: cuenta.codResidente,
    });
    const unidad = residente
      ? await this.unidadRepository.findOneBy({
          codUnidad: residente.codUnidad,
        })
      : null;
    const inmueble = unidad
      ? await this.inmuebleRepository.findOneBy({
          codInmueble: unidad.codInmueble,
        })
      : null;

    verificarTenant(inmueble?.codTenant, datosUsuario, 'Cuenta no encontrada');
    return cuenta;
  }

  public async registrarPago(
    codCuenta: number,
    datos: RegistrarPagoDto,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    const cuenta = await this.obtenerCuentaDelTenant(codCuenta, datosUsuario);

    await this.pagoRepository.save(
      this.pagoRepository.create({
        codCuenta,
        monto: datos.monto,
        fecha: datos.fecha ? new Date(datos.fecha) : new Date(),
        metodo: datos.metodo,
        referencia: datos.referencia,
      }),
    );

    const resultado = await this.pagoRepository
      .createQueryBuilder('pago')
      .select('COALESCE(SUM(pago.monto), 0)', 'totalPagado')
      .where('pago.cod_cuenta = :codCuenta', { codCuenta })
      .getRawOne<{ totalPagado: string }>();

    if (Number(resultado?.totalPagado ?? 0) >= Number(cuenta.total)) {
      await this.cuentaRepository.update(codCuenta, {
        estado: EstadoCuenta.PAGADA,
      });
    }

    return { mensaje: 'Pago registrado correctamente' };
  }
}
