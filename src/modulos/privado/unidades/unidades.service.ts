import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';

import { Unidad } from 'src/modelos/unidad/unidad';
import { Inmueble } from 'src/modelos/inmueble/inmueble';
import { CrearUnidadDto } from './dto/crear-unidad.dto';
import { ActualizarUnidadDto } from './dto/actualizar-unidad.dto';
import { verificarTenant } from 'src/middleware/seguridad/tenant.helper';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class UnidadesService {
  private unidadRepository: Repository<Unidad>;
  private inmuebleRepository: Repository<Inmueble>;

  constructor(private readonly poolConexion: DataSource) {
    this.unidadRepository = poolConexion.getRepository(Unidad);
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
    await this.consultarUno(id, datosUsuario);
    await this.unidadRepository.update(id, datos);
    return { mensaje: 'Unidad actualizada correctamente' };
  }

  public async eliminar(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    await this.consultarUno(id, datosUsuario);
    await this.unidadRepository.delete(id);
    return { mensaje: 'Unidad eliminada correctamente' };
  }
}
