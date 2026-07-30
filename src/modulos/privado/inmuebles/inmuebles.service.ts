import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Inmueble } from 'src/modelos/inmueble/inmueble';
import { CrearInmuebleDto } from './dto/crear-inmueble.dto';
import { ActualizarInmuebleDto } from './dto/actualizar-inmueble.dto';
import { obtenerTenantId } from 'src/middleware/seguridad/rol.helper';
import { verificarTenant } from 'src/middleware/seguridad/tenant.helper';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class InmueblesService {
  private inmuebleRepository: Repository<Inmueble>;

  constructor(private readonly poolConexion: DataSource) {
    this.inmuebleRepository = poolConexion.getRepository(Inmueble);
  }

  public async consultar(datosUsuario: SesionUsuario): Promise<Inmueble[]> {
    return this.inmuebleRepository.find({
      where: { codTenant: obtenerTenantId(datosUsuario)! },
      order: { creadoEn: 'DESC' },
    });
  }

  public async consultarUno(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<Inmueble> {
    const inmueble = await this.inmuebleRepository.findOneBy({
      codInmueble: id,
    });

    if (!inmueble) {
      throw new HttpException('Inmueble no encontrado', HttpStatus.NOT_FOUND);
    }
    verificarTenant(inmueble.codTenant, datosUsuario, 'Inmueble no encontrado');

    return inmueble;
  }

  public async registrar(
    datos: CrearInmuebleDto,
    datosUsuario: SesionUsuario,
  ): Promise<Inmueble> {
    const nuevoInmueble = this.inmuebleRepository.create({
      ...datos,
      codTenant: obtenerTenantId(datosUsuario)!,
    });

    return this.inmuebleRepository.save(nuevoInmueble);
  }

  public async actualizar(
    id: number,
    datos: ActualizarInmuebleDto,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    await this.consultarUno(id, datosUsuario);

    await this.inmuebleRepository.update(id, datos);

    return { mensaje: 'Inmueble actualizado correctamente' };
  }

  public async eliminar(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    await this.consultarUno(id, datosUsuario);

    await this.inmuebleRepository.delete(id);

    return { mensaje: 'Inmueble eliminado correctamente' };
  }
}
