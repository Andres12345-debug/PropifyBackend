import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Torre } from 'src/modelos/torre/torre';
import { Inmueble } from 'src/modelos/inmueble/inmueble';
import { CrearTorreDto } from './dto/crear-torre.dto';
import { ActualizarTorreDto } from './dto/actualizar-torre.dto';
import { verificarTenant } from 'src/middleware/seguridad/tenant.helper';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class TorresService {
  private torreRepository: Repository<Torre>;
  private inmuebleRepository: Repository<Inmueble>;

  constructor(private readonly poolConexion: DataSource) {
    this.torreRepository = poolConexion.getRepository(Torre);
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
    return inmueble;
  }

  public async consultar(
    codInmueble: number,
    datosUsuario: SesionUsuario,
  ): Promise<Torre[]> {
    await this.verificarInmuebleDelTenant(codInmueble, datosUsuario);
    return this.torreRepository.find({ where: { codInmueble } });
  }

  public async consultarUno(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<Torre> {
    const torre = await this.torreRepository.findOneBy({ codTorre: id });
    if (!torre) {
      throw new HttpException('Torre no encontrada', HttpStatus.NOT_FOUND);
    }
    await this.verificarInmuebleDelTenant(torre.codInmueble, datosUsuario);
    return torre;
  }

  public async registrar(
    datos: CrearTorreDto,
    datosUsuario: SesionUsuario,
  ): Promise<Torre> {
    await this.verificarInmuebleDelTenant(datos.codInmueble, datosUsuario);

    const nuevaTorre = this.torreRepository.create(datos);
    return this.torreRepository.save(nuevaTorre);
  }

  public async actualizar(
    id: number,
    datos: ActualizarTorreDto,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    await this.consultarUno(id, datosUsuario);
    await this.torreRepository.update(id, datos);
    return { mensaje: 'Torre actualizada correctamente' };
  }

  public async eliminar(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    await this.consultarUno(id, datosUsuario);
    await this.torreRepository.delete(id);
    return { mensaje: 'Torre eliminada correctamente' };
  }
}
