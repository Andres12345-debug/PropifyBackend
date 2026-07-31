import { Injectable, Logger } from '@nestjs/common';
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
import { Reserva, EstadoReserva } from 'src/modelos/reserva/reserva';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import {
  CanalNotificacion,
  TipoNotificacion,
} from 'src/modelos/notificacion-enviada/notificacion-enviada';

const DIAS_AVISO_RECORDATORIO = 3;

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
  private reservaRepository: Repository<Reserva>;

  constructor(
    private readonly poolConexion: DataSource,
    private readonly notificacionesService: NotificacionesService,
  ) {
    this.residenteRepository = poolConexion.getRepository(Residente);
    this.cuentaRepository = poolConexion.getRepository(CuentaMensual);
    this.cargoRepository = poolConexion.getRepository(CargoDetalle);
    this.reservaRepository = poolConexion.getRepository(Reserva);
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
<<<<<<< HEAD

      const yaEnviado = await this.notificacionesService.yaSeEnvioHoy(
        cuenta.codCuenta,
        TipoNotificacion.RECORDATORIO_PAGO,
      );
      if (yaEnviado) {
        continue;
      }

      const residente = await this.residenteRepository.findOneBy({
        codResidente: cuenta.codResidente,
      });
      if (!residente) continue;

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
=======
>>>>>>> a4af88ea8fb20ab691de0ff764365d78912a2b59
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

    await this.notificacionesService.enviar(
      TipoNotificacion.RECORDATORIO_PAGO,
      residente.telefono,
      `Recordatorio: tu cuenta de ${cuenta.periodo} por $${cuenta.total} vence el ${cuenta.fechaVencimiento.toLocaleDateString()}.`,
      cuenta.codCuenta,
    );
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
<<<<<<< HEAD

      const residente = await this.residenteRepository.findOneBy({
        codResidente: cuenta.codResidente,
      });
      if (!residente) continue;

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
=======
>>>>>>> a4af88ea8fb20ab691de0ff764365d78912a2b59
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

    await this.notificacionesService.enviar(
      TipoNotificacion.MORA,
      residente.telefono,
      `Tu cuenta de ${cuenta.periodo} está vencida. Total adeudado: $${cuenta.total}.`,
      cuenta.codCuenta,
    );
  }
}
