import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Parqueadero } from 'src/modelos/parqueadero/parqueadero';
import { Inmueble } from 'src/modelos/inmueble/inmueble';
import { Unidad } from 'src/modelos/unidad/unidad';
import { CrearParqueaderoDto } from './dto/crear-parqueadero.dto';
import { ActualizarParqueaderoDto } from './dto/actualizar-parqueadero.dto';
import { verificarTenant } from 'src/middleware/seguridad/tenant.helper';
import { esViolacionUnicidad } from 'src/utilidades/compartido/fk-conflict.helper';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class ParqueaderosService {
  private parqueaderoRepository: Repository<Parqueadero>;
  private inmuebleRepository: Repository<Inmueble>;
  private unidadRepository: Repository<Unidad>;

  constructor(private readonly poolConexion: DataSource) {
    this.parqueaderoRepository = poolConexion.getRepository(Parqueadero);
    this.inmuebleRepository = poolConexion.getRepository(Inmueble);
    this.unidadRepository = poolConexion.getRepository(Unidad);
  }

  // Sin esto, se podía asignar un parqueadero a una Unidad de OTRO
  // inmueble (incluso de otro tenant, ya que codUnidad es un entero
  // adivinable) sin ninguna validación — mismo bug ya corregido para
  // Unidad.codTorre.
  private async verificarUnidadDelInmueble(
    codUnidad: number,
    codInmueble: number,
  ): Promise<void> {
    const unidad = await this.unidadRepository.findOneBy({ codUnidad });
    if (!unidad || unidad.codInmueble !== codInmueble) {
      throw new HttpException(
        'La unidad indicada no pertenece a este inmueble',
        HttpStatus.BAD_REQUEST,
      );
    }
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

    if (datos.codUnidad) {
      await this.verificarUnidadDelInmueble(datos.codUnidad, datos.codInmueble);
    }

    try {
      const nuevoParqueadero = this.parqueaderoRepository.create(datos);
      return await this.parqueaderoRepository.save(nuevoParqueadero);
    } catch (error: unknown) {
      if (esViolacionUnicidad(error)) {
        throw new HttpException(
          'Ya existe un parqueadero con ese número en este inmueble',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }

  public async actualizar(
    id: number,
    datos: ActualizarParqueaderoDto,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    const parqueadero = await this.obtenerParqueaderoDelTenant(
      id,
      datosUsuario,
    );

    if (datos.codUnidad) {
      await this.verificarUnidadDelInmueble(
        datos.codUnidad,
        parqueadero.codInmueble,
      );
    }

    try {
      await this.parqueaderoRepository.update(id, datos);
    } catch (error: unknown) {
      if (esViolacionUnicidad(error)) {
        throw new HttpException(
          'Ya existe un parqueadero con ese número en este inmueble',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }

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
