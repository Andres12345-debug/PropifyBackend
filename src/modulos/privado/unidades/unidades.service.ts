import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';

import { Unidad } from 'src/modelos/unidad/unidad';
import { Inmueble } from 'src/modelos/inmueble/inmueble';
import { Torre } from 'src/modelos/torre/torre';
import { CrearUnidadDto } from './dto/crear-unidad.dto';
import { ActualizarUnidadDto } from './dto/actualizar-unidad.dto';
import { verificarTenant } from 'src/middleware/seguridad/tenant.helper';
import {
  esViolacionForeignKey,
  esViolacionUnicidad,
} from 'src/utilidades/compartido/fk-conflict.helper';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class UnidadesService {
  private unidadRepository: Repository<Unidad>;
  private inmuebleRepository: Repository<Inmueble>;
  private torreRepository: Repository<Torre>;

  constructor(private readonly poolConexion: DataSource) {
    this.unidadRepository = poolConexion.getRepository(Unidad);
    this.inmuebleRepository = poolConexion.getRepository(Inmueble);
    this.torreRepository = poolConexion.getRepository(Torre);
  }

  // Sin esto, se podía crear/mover una Unidad a una Torre de OTRO inmueble
  // (incluso de otro tenant, ya que codTorre es un entero adivinable) sin
  // ninguna validación — corrompiendo la integridad referencial y, en el
  // peor caso, mezclando datos entre tenants.
  private async verificarTorreDelInmueble(
    codTorre: number,
    codInmueble: number,
  ): Promise<void> {
    const torre = await this.torreRepository.findOneBy({ codTorre });
    if (!torre || torre.codInmueble !== codInmueble) {
      throw new HttpException(
        'La torre indicada no pertenece a este inmueble',
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
    return inmueble;
  }

  public async consultar(
    codInmueble: number,
    datosUsuario: SesionUsuario,
  ): Promise<Unidad[]> {
    await this.verificarInmuebleDelTenant(codInmueble, datosUsuario);
    return this.unidadRepository.find({ where: { codInmueble } });
  }

  public async consultarUno(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<Unidad> {
    const unidad = await this.unidadRepository.findOneBy({ codUnidad: id });
    if (!unidad) {
      throw new HttpException('Unidad no encontrada', HttpStatus.NOT_FOUND);
    }
    await this.verificarInmuebleDelTenant(unidad.codInmueble, datosUsuario);
    return unidad;
  }

  public async registrar(
    datos: CrearUnidadDto,
    datosUsuario: SesionUsuario,
  ): Promise<Unidad> {
    const inmueble = await this.verificarInmuebleDelTenant(
      datos.codInmueble,
      datosUsuario,
    );

    // "Casa Adaptada": si el inmueble no maneja torres, la unidad nunca
    // lleva codTorre.
    const codTorre = inmueble.tieneTorres ? datos.codTorre : undefined;

    if (codTorre) {
      await this.verificarTorreDelInmueble(codTorre, datos.codInmueble);
    }

    const yaExiste = await this.unidadRepository.findOne({
      where: {
        codInmueble: datos.codInmueble,
        codTorre: codTorre ?? IsNull(),
        identificador: datos.identificador,
      },
    });
    if (yaExiste) {
      throw new HttpException(
        'Ya existe una unidad con ese identificador en esa torre/inmueble',
        HttpStatus.CONFLICT,
      );
    }

    const nuevaUnidad = this.unidadRepository.create({
      ...datos,
      codTorre,
    });
    return this.unidadRepository.save(nuevaUnidad);
  }

  public async actualizar(
    id: number,
    datos: ActualizarUnidadDto,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    const unidad = await this.consultarUno(id, datosUsuario);

    if (datos.codTorre) {
      await this.verificarTorreDelInmueble(datos.codTorre, unidad.codInmueble);
    }

    try {
      await this.unidadRepository.update(id, datos);
    } catch (error: unknown) {
      if (esViolacionUnicidad(error)) {
        throw new HttpException(
          'Ya existe una unidad con ese identificador en esa torre/inmueble',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }

    return { mensaje: 'Unidad actualizada correctamente' };
  }

  public async eliminar(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    await this.consultarUno(id, datosUsuario);

    try {
      await this.unidadRepository.delete(id);
    } catch (error: unknown) {
      if (esViolacionForeignKey(error)) {
        throw new HttpException(
          'No se puede eliminar: la unidad tiene registros asociados (residentes, visitas, paquetes u otros)',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }

    return { mensaje: 'Unidad eliminada correctamente' };
  }
}
