import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Reserva, EstadoReserva } from 'src/modelos/reserva/reserva';
import { ZonaComun } from 'src/modelos/zona-comun/zona-comun';
import { Residente } from 'src/modelos/residente/residente';
import { Unidad } from 'src/modelos/unidad/unidad';
import { Inmueble } from 'src/modelos/inmueble/inmueble';
import {
  CuentaMensual,
  EstadoCuenta,
} from 'src/modelos/cuenta-mensual/cuenta-mensual';
import { CrearReservaDto } from './dto/crear-reserva.dto';
import { obtenerUsuarioId } from 'src/middleware/seguridad/rol.helper';
import { verificarTenant } from 'src/middleware/seguridad/tenant.helper';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class ReservasService {
  private reservaRepository: Repository<Reserva>;
  private zonaRepository: Repository<ZonaComun>;
  private residenteRepository: Repository<Residente>;
  private unidadRepository: Repository<Unidad>;
  private inmuebleRepository: Repository<Inmueble>;
  private cuentaRepository: Repository<CuentaMensual>;

  constructor(private readonly poolConexion: DataSource) {
    this.reservaRepository = poolConexion.getRepository(Reserva);
    this.zonaRepository = poolConexion.getRepository(ZonaComun);
    this.residenteRepository = poolConexion.getRepository(Residente);
    this.unidadRepository = poolConexion.getRepository(Unidad);
    this.inmuebleRepository = poolConexion.getRepository(Inmueble);
    this.cuentaRepository = poolConexion.getRepository(CuentaMensual);
  }

  private async obtenerResidentePropio(
    datosUsuario: SesionUsuario,
  ): Promise<Residente> {
    const residente = await this.residenteRepository.findOneBy({
      codUsuario: obtenerUsuarioId(datosUsuario)!,
    });
    if (!residente) {
      throw new HttpException(
        'No tienes un registro de residente asociado',
        HttpStatus.NOT_FOUND,
      );
    }
    return residente;
  }

  public async consultarMias(datosUsuario: SesionUsuario): Promise<Reserva[]> {
    const residente = await this.obtenerResidentePropio(datosUsuario);
    return this.reservaRepository.find({
      where: { codResidente: residente.codResidente },
      order: { fecha: 'DESC' },
    });
  }

  public async consultarPorZona(
    codZona: number,
    datosUsuario: SesionUsuario,
  ): Promise<Reserva[]> {
    const zona = await this.zonaRepository.findOneBy({ codZona });
    if (!zona) {
      throw new HttpException('Zona no encontrada', HttpStatus.NOT_FOUND);
    }
    const inmueble = await this.inmuebleRepository.findOneBy({
      codInmueble: zona.codInmueble,
    });
    verificarTenant(inmueble?.codTenant, datosUsuario, 'Zona no encontrada');

    return this.reservaRepository.find({ where: { codZona } });
  }

  public async registrar(
    datos: CrearReservaDto,
    datosUsuario: SesionUsuario,
  ): Promise<Reserva> {
    const residente = await this.obtenerResidentePropio(datosUsuario);

    if (datos.horaInicio >= datos.horaFin) {
      throw new HttpException(
        'horaInicio debe ser anterior a horaFin',
        HttpStatus.BAD_REQUEST,
      );
    }

    const fechaReserva = new Date(datos.fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fechaReserva < hoy) {
      throw new HttpException(
        'No puedes reservar una fecha pasada',
        HttpStatus.BAD_REQUEST,
      );
    }

    const zona = await this.zonaRepository.findOneBy({
      codZona: datos.codZona,
    });
    if (!zona || !zona.activa) {
      throw new HttpException('Zona no encontrada', HttpStatus.NOT_FOUND);
    }

    if (zona.horaApertura && datos.horaInicio < zona.horaApertura) {
      throw new HttpException(
        `La zona abre a las ${zona.horaApertura}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (zona.horaCierre && datos.horaFin > zona.horaCierre) {
      throw new HttpException(
        `La zona cierra a las ${zona.horaCierre}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const unidad = await this.unidadRepository.findOneBy({
      codUnidad: residente.codUnidad,
    });
    if (!unidad || unidad.codInmueble !== zona.codInmueble) {
      throw new HttpException(
        'La zona no pertenece a tu inmueble',
        HttpStatus.NOT_FOUND,
      );
    }

    // Bloqueo por mora (spec §4.5): mientras tenga una cuenta VENCIDA no
    // puede reservar zonas comunes. Se valida aquí, no solo en la UI.
    const cuentaVencida = await this.cuentaRepository.findOne({
      where: {
        codResidente: residente.codResidente,
        estado: EstadoCuenta.VENCIDA,
      },
    });
    if (cuentaVencida) {
      throw new ForbiddenException(
        'No puedes reservar zonas comunes mientras tengas una cuenta vencida',
      );
    }

    const queryRunner = this.poolConexion.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Advisory lock por zona: serializa reservas concurrentes de la
      // misma zona dentro de esta transacción (se libera sola al hacer
      // commit/rollback). Sin esto, dos solicitudes casi simultáneas para
      // el mismo horario podían pasar ambas el chequeo de choque antes de
      // que ninguna hubiera confirmado la suya — doble reserva del mismo
      // recurso compartido.
      await queryRunner.query('SELECT pg_advisory_xact_lock($1)', [
        zona.codZona,
      ]);

      const choque = await queryRunner.manager
        .getRepository(Reserva)
        .createQueryBuilder('reserva')
        .where('reserva.cod_zona = :codZona', { codZona: zona.codZona })
        .andWhere('reserva.fecha = :fecha', { fecha: fechaReserva })
        .andWhere('reserva.estado = :estado', {
          estado: EstadoReserva.CONFIRMADA,
        })
        .andWhere('reserva.hora_inicio < :horaFin', {
          horaFin: datos.horaFin,
        })
        .andWhere('reserva.hora_fin > :horaInicio', {
          horaInicio: datos.horaInicio,
        })
        .getOne();

      if (choque) {
        throw new HttpException(
          'Ya existe una reserva confirmada que se cruza con ese horario',
          HttpStatus.CONFLICT,
        );
      }

      const nuevaReserva = queryRunner.manager.getRepository(Reserva).create({
        codZona: zona.codZona,
        codResidente: residente.codResidente,
        fecha: fechaReserva,
        horaInicio: datos.horaInicio,
        horaFin: datos.horaFin,
        costo: zona.precio,
        estado: EstadoReserva.CONFIRMADA,
      });
      const reservaGuardada = await queryRunner.manager.save(nuevaReserva);

      await queryRunner.commitTransaction();
      return reservaGuardada;
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al registrar la reserva',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  public async cancelar(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    const residente = await this.obtenerResidentePropio(datosUsuario);
    const reserva = await this.reservaRepository.findOneBy({ codReserva: id });

    if (!reserva || reserva.codResidente !== residente.codResidente) {
      throw new HttpException('Reserva no encontrada', HttpStatus.NOT_FOUND);
    }

    await this.reservaRepository.update(id, {
      estado: EstadoReserva.CANCELADA,
    });

    return { mensaje: 'Reserva cancelada correctamente' };
  }
}
