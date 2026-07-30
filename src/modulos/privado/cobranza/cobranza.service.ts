import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource, LessThan, Not, Repository } from 'typeorm';

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
import { TipoNotificacion } from 'src/modelos/notificacion-enviada/notificacion-enviada';

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

  // Corre una sola vez al día, 6am hora del servidor (spec §4).
  @Cron('0 6 * * *')
  public async ejecutarCobranzaDiaria(): Promise<void> {
    this.logger.log('Iniciando ciclo de cobranza diaria');
    const hoy = new Date();

    await this.generarCuentasDelPeriodo(hoy);
    await this.actualizarCuentasVencidas(hoy);
    await this.enviarRecordatorios(hoy);
    await this.enviarAvisosMora();

    this.logger.log('Ciclo de cobranza diaria finalizado');
  }

  private async generarCuentasDelPeriodo(hoy: Date): Promise<void> {
    const periodo = periodoDe(hoy);
    const residentesActivos = await this.residenteRepository.find({
      where: { activo: true },
    });

    for (const residente of residentesActivos) {
      const fechaVencimiento = calcularFechaVencimiento(hoy, residente.diaPago);
      if (!esMismoDia(fechaVencimiento, hoy)) {
        continue;
      }

      const yaExiste = await this.cuentaRepository.findOne({
        where: { codResidente: residente.codResidente, periodo },
      });
      if (yaExiste) {
        continue;
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
  }

  private async actualizarCuentasVencidas(hoy: Date): Promise<void> {
    await this.cuentaRepository.update(
      {
        fechaVencimiento: LessThan(hoy),
        estado: Not(EstadoCuenta.PAGADA),
      },
      { estado: EstadoCuenta.VENCIDA },
    );
  }

  private async enviarRecordatorios(hoy: Date): Promise<void> {
    const cuentasPendientes = await this.cuentaRepository.find({
      where: { estado: EstadoCuenta.PENDIENTE },
    });

    for (const cuenta of cuentasPendientes) {
      const diasParaVencer = Math.round(
        (cuenta.fechaVencimiento.getTime() - hoy.getTime()) /
          (24 * 60 * 60 * 1000),
      );
      if (diasParaVencer !== DIAS_AVISO_RECORDATORIO) {
        continue;
      }

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

      await this.notificacionesService.enviar(
        TipoNotificacion.RECORDATORIO_PAGO,
        residente.telefono,
        `Recordatorio: tu cuenta de ${cuenta.periodo} por $${cuenta.total} vence el ${cuenta.fechaVencimiento.toLocaleDateString()}.`,
        cuenta.codCuenta,
      );
    }
  }

  private async enviarAvisosMora(): Promise<void> {
    const cuentasVencidas = await this.cuentaRepository.find({
      where: { estado: EstadoCuenta.VENCIDA },
    });

    for (const cuenta of cuentasVencidas) {
      const yaEnviado = await this.notificacionesService.yaSeEnvioHoy(
        cuenta.codCuenta,
        TipoNotificacion.MORA,
      );
      if (yaEnviado) {
        continue;
      }

      const residente = await this.residenteRepository.findOneBy({
        codResidente: cuenta.codResidente,
      });
      if (!residente) continue;

      await this.notificacionesService.enviar(
        TipoNotificacion.MORA,
        residente.telefono,
        `Tu cuenta de ${cuenta.periodo} está vencida. Total adeudado: $${cuenta.total}.`,
        cuenta.codCuenta,
      );
    }
  }
}
