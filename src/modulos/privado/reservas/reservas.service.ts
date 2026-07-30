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

    const zona = await this.zonaRepository.findOneBy({
      codZona: datos.codZona,
    });
    if (!zona || !zona.activa) {
      throw new HttpException('Zona no encontrada', HttpStatus.NOT_FOUND);
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

    const nuevaReserva = this.reservaRepository.create({
      codZona: zona.codZona,
      codResidente: residente.codResidente,
      fecha: new Date(datos.fecha),
      horaInicio: datos.horaInicio,
      horaFin: datos.horaFin,
      costo: zona.precio,
      estado: EstadoReserva.CONFIRMADA,
    });

    return this.reservaRepository.save(nuevaReserva);
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
