import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { ZonaComun } from 'src/modelos/zona-comun/zona-comun';
import { Inmueble } from 'src/modelos/inmueble/inmueble';
import { CrearZonaComunDto } from './dto/crear-zona-comun.dto';
import { ActualizarZonaComunDto } from './dto/actualizar-zona-comun.dto';
import { verificarTenant } from 'src/middleware/seguridad/tenant.helper';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class ZonasComunesService {
  private zonaRepository: Repository<ZonaComun>;
  private inmuebleRepository: Repository<Inmueble>;

  constructor(private readonly poolConexion: DataSource) {
    this.zonaRepository = poolConexion.getRepository(ZonaComun);
    this.inmuebleRepository = poolConexion.getRepository(Inmueble);
  }

  private async verificarInmuebleDelTenant(
    codInmueble: number,
    datosUsuario: SesionUsuario,
  ): Promise<Inmueble> {
    const inmueble = await this.inmuebleRepository.findOneBy({ codInmueble });
    if (!inmueble) {
      throw new HttpException('Inmueble no encontrado', HttpStatus.NOT_FOUND);
    }
    verificarTenant(inmueble.codTenant, datosUsuario, 'Inmueble no encontrado');
    if (!inmueble.tieneZonasComunes) {
      throw new HttpException(
        'Este inmueble no tiene el módulo de zonas comunes activo',
        HttpStatus.BAD_REQUEST,
      );
    }
    return inmueble;
  }

  private async obtenerZonaDelTenant(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<ZonaComun> {
    const zona = await this.zonaRepository.findOneBy({ codZona: id });
    if (!zona) {
      throw new HttpException('Zona no encontrada', HttpStatus.NOT_FOUND);
    }
    const inmueble = await this.inmuebleRepository.findOneBy({
      codInmueble: zona.codInmueble,
    });
    verificarTenant(inmueble?.codTenant, datosUsuario, 'Zona no encontrada');
    return zona;
  }

  public async consultar(
    codInmueble: number,
    datosUsuario: SesionUsuario,
  ): Promise<ZonaComun[]> {
    const inmueble = await this.inmuebleRepository.findOneBy({ codInmueble });
    if (!inmueble) {
      throw new HttpException('Inmueble no encontrado', HttpStatus.NOT_FOUND);
    }
    verificarTenant(inmueble.codTenant, datosUsuario, 'Inmueble no encontrado');
    return this.zonaRepository.find({ where: { codInmueble } });
  }

  public async consultarUna(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<ZonaComun> {
    return this.obtenerZonaDelTenant(id, datosUsuario);
  }

  public async registrar(
    datos: CrearZonaComunDto,
    datosUsuario: SesionUsuario,
  ): Promise<ZonaComun> {
    await this.verificarInmuebleDelTenant(datos.codInmueble, datosUsuario);

    const nuevaZona = this.zonaRepository.create(datos);
    return this.zonaRepository.save(nuevaZona);
  }

  public async actualizar(
    id: number,
    datos: ActualizarZonaComunDto,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    await this.obtenerZonaDelTenant(id, datosUsuario);
    await this.zonaRepository.update(id, datos);
    return { mensaje: 'Zona común actualizada correctamente' };
  }

  public async eliminar(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    await this.obtenerZonaDelTenant(id, datosUsuario);
    await this.zonaRepository.delete(id);
    return { mensaje: 'Zona común eliminada correctamente' };
  }
}
