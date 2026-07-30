import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Residente } from 'src/modelos/residente/residente';
import { Unidad } from 'src/modelos/unidad/unidad';
import { Inmueble } from 'src/modelos/inmueble/inmueble';
import { Usuario } from 'src/modelos/usuario/usuario';
import { Rol } from 'src/modelos/rol/rol';
import { CrearResidenteDto } from './dto/crear-residente.dto';
import { ActualizarResidenteDto } from './dto/actualizar-residente.dto';
import {
  RoleNames,
  obtenerUsuarioId,
} from 'src/middleware/seguridad/rol.helper';
import { verificarTenant } from 'src/middleware/seguridad/tenant.helper';
import { esViolacionForeignKey } from 'src/utilidades/compartido/fk-conflict.helper';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class ResidentesService {
  private residenteRepository: Repository<Residente>;
  private unidadRepository: Repository<Unidad>;
  private inmuebleRepository: Repository<Inmueble>;
  private usuarioRepository: Repository<Usuario>;
  private rolRepository: Repository<Rol>;

  constructor(private readonly poolConexion: DataSource) {
    this.residenteRepository = poolConexion.getRepository(Residente);
    this.unidadRepository = poolConexion.getRepository(Unidad);
    this.inmuebleRepository = poolConexion.getRepository(Inmueble);
    this.usuarioRepository = poolConexion.getRepository(Usuario);
    this.rolRepository = poolConexion.getRepository(Rol);
  }

  private async verificarUnidadDelTenant(
    codUnidad: number,
    datosUsuario: SesionUsuario,
  ): Promise<Unidad> {
    const unidad = await this.unidadRepository.findOneBy({ codUnidad });
    if (!unidad) {
      throw new HttpException('Unidad no encontrada', HttpStatus.NOT_FOUND);
    }
    const inmueble = await this.inmuebleRepository.findOneBy({
      codInmueble: unidad.codInmueble,
    });
    verificarTenant(inmueble?.codTenant, datosUsuario, 'Unidad no encontrada');
    return unidad;
  }

  // El chequeo de tenant de un Residente pasa siempre por su Unidad — el
  // Residente no lleva codTenant propio.
  private async obtenerResidenteDelTenant(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<Residente> {
    const residente = await this.residenteRepository.findOneBy({
      codResidente: id,
    });
    if (!residente) {
      throw new HttpException('Residente no encontrado', HttpStatus.NOT_FOUND);
    }
    await this.verificarUnidadDelTenant(residente.codUnidad, datosUsuario);
    return residente;
  }

  public async consultar(
    codUnidad: number,
    datosUsuario: SesionUsuario,
  ): Promise<Residente[]> {
    await this.verificarUnidadDelTenant(codUnidad, datosUsuario);
    return this.residenteRepository.find({ where: { codUnidad } });
  }

  public async consultarUno(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<Residente> {
    return this.obtenerResidenteDelTenant(id, datosUsuario);
  }

  public async consultarMe(datosUsuario: SesionUsuario): Promise<Residente> {
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

  private async validarUsuarioResidente(
    codUsuario: number,
    datosUsuario: SesionUsuario,
  ): Promise<void> {
    const usuario = await this.usuarioRepository.findOneBy({ codUsuario });
    if (!usuario) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }
    verificarTenant(usuario.codTenant, datosUsuario, 'Usuario no encontrado');

    const rol = await this.rolRepository.findOneBy({ codRol: usuario.codRol });
    if (!rol || rol.nombreRol !== RoleNames.RESIDENTE) {
      throw new HttpException(
        'El usuario asociado debe tener rol residente',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  public async registrar(
    datos: CrearResidenteDto,
    datosUsuario: SesionUsuario,
  ): Promise<Residente> {
    await this.verificarUnidadDelTenant(datos.codUnidad, datosUsuario);

    if (datos.codUsuario) {
      await this.validarUsuarioResidente(datos.codUsuario, datosUsuario);
    }

    const nuevoResidente = this.residenteRepository.create({
      ...datos,
      fechaInicio: datos.fechaInicio ? new Date(datos.fechaInicio) : new Date(),
      fechaFin: datos.fechaFin ? new Date(datos.fechaFin) : undefined,
    });

    return this.residenteRepository.save(nuevoResidente);
  }

  public async actualizar(
    id: number,
    datos: ActualizarResidenteDto,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    await this.obtenerResidenteDelTenant(id, datosUsuario);

    await this.residenteRepository.update(id, {
      ...datos,
      fechaFin: datos.fechaFin ? new Date(datos.fechaFin) : undefined,
    });

    return { mensaje: 'Residente actualizado correctamente' };
  }

  public async eliminar(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    await this.obtenerResidenteDelTenant(id, datosUsuario);

    try {
      await this.residenteRepository.delete(id);
    } catch (error: unknown) {
      if (esViolacionForeignKey(error)) {
        throw new HttpException(
          'No se puede eliminar: el residente tiene registros asociados (cuentas, reservas, reportes u otros)',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }

    return { mensaje: 'Residente eliminado correctamente' };
  }
}
