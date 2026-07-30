import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Parqueadero } from 'src/modelos/parqueadero/parqueadero';
import { Inmueble } from 'src/modelos/inmueble/inmueble';
import { CrearParqueaderoDto } from './dto/crear-parqueadero.dto';
import { ActualizarParqueaderoDto } from './dto/actualizar-parqueadero.dto';
import { verificarTenant } from 'src/middleware/seguridad/tenant.helper';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class ParqueaderosService {
  private parqueaderoRepository: Repository<Parqueadero>;
  private inmuebleRepository: Repository<Inmueble>;

  constructor(private readonly poolConexion: DataSource) {
    this.parqueaderoRepository = poolConexion.getRepository(Parqueadero);
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
    if (!inmueble.tieneParqueaderos) {
      throw new HttpException(
        'Este inmueble no tiene el módulo de parqueaderos activo',
        HttpStatus.BAD_REQUEST,
      );
    }
    return inmueble;
  }

  private async obtenerParqueaderoDelTenant(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<Parqueadero> {
    const parqueadero = await this.parqueaderoRepository.findOneBy({
      codParqueadero: id,
    });
    if (!parqueadero) {
      throw new HttpException(
        'Parqueadero no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    const inmueble = await this.inmuebleRepository.findOneBy({
      codInmueble: parqueadero.codInmueble,
    });
    verificarTenant(
      inmueble?.codTenant,
      datosUsuario,
      'Parqueadero no encontrado',
    );
    return parqueadero;
  }

  public async consultar(
    codInmueble: number,
    datosUsuario: SesionUsuario,
  ): Promise<Parqueadero[]> {
    const inmueble = await this.inmuebleRepository.findOneBy({ codInmueble });
    if (!inmueble) {
      throw new HttpException('Inmueble no encontrado', HttpStatus.NOT_FOUND);
    }
    verificarTenant(inmueble.codTenant, datosUsuario, 'Inmueble no encontrado');
    return this.parqueaderoRepository.find({ where: { codInmueble } });
  }

  public async registrar(
    datos: CrearParqueaderoDto,
    datosUsuario: SesionUsuario,
  ): Promise<Parqueadero> {
    await this.verificarInmuebleDelTenant(datos.codInmueble, datosUsuario);

    const nuevoParqueadero = this.parqueaderoRepository.create(datos);
    return this.parqueaderoRepository.save(nuevoParqueadero);
  }

  public async actualizar(
    id: number,
    datos: ActualizarParqueaderoDto,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    await this.obtenerParqueaderoDelTenant(id, datosUsuario);
    await this.parqueaderoRepository.update(id, datos);
    return { mensaje: 'Parqueadero actualizado correctamente' };
  }

  public async eliminar(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    await this.obtenerParqueaderoDelTenant(id, datosUsuario);
    await this.parqueaderoRepository.delete(id);
    return { mensaje: 'Parqueadero eliminado correctamente' };
  }
}
