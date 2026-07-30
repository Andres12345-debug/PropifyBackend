import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Gasto } from 'src/modelos/gasto/gasto';
import { Inmueble } from 'src/modelos/inmueble/inmueble';
import { CrearGastoDto } from './dto/crear-gasto.dto';
import { ActualizarGastoDto } from './dto/actualizar-gasto.dto';
import { verificarTenant } from 'src/middleware/seguridad/tenant.helper';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class GastosService {
  private gastoRepository: Repository<Gasto>;
  private inmuebleRepository: Repository<Inmueble>;

  constructor(private readonly poolConexion: DataSource) {
    this.gastoRepository = poolConexion.getRepository(Gasto);
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

  private async obtenerGastoDelTenant(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<Gasto> {
    const gasto = await this.gastoRepository.findOneBy({ codGasto: id });
    if (!gasto) {
      throw new HttpException('Gasto no encontrado', HttpStatus.NOT_FOUND);
    }
    await this.verificarInmuebleDelTenant(gasto.codInmueble, datosUsuario);
    return gasto;
  }

  public async consultar(
    codInmueble: number,
    datosUsuario: SesionUsuario,
  ): Promise<Gasto[]> {
    await this.verificarInmuebleDelTenant(codInmueble, datosUsuario);
    return this.gastoRepository.find({
      where: { codInmueble },
      order: { fecha: 'DESC' },
    });
  }

  public async registrar(
    datos: CrearGastoDto,
    datosUsuario: SesionUsuario,
  ): Promise<Gasto> {
    await this.verificarInmuebleDelTenant(datos.codInmueble, datosUsuario);

    const nuevoGasto = this.gastoRepository.create({
      ...datos,
      fecha: datos.fecha ? new Date(datos.fecha) : new Date(),
    });
    return this.gastoRepository.save(nuevoGasto);
  }

  public async actualizar(
    id: number,
    datos: ActualizarGastoDto,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    await this.obtenerGastoDelTenant(id, datosUsuario);

    await this.gastoRepository.update(id, {
      ...datos,
      fecha: datos.fecha ? new Date(datos.fecha) : undefined,
    });

    return { mensaje: 'Gasto actualizado correctamente' };
  }

  public async eliminar(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    await this.obtenerGastoDelTenant(id, datosUsuario);
    await this.gastoRepository.delete(id);
    return { mensaje: 'Gasto eliminado correctamente' };
  }
}
