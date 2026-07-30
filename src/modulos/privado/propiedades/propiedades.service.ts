import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Propiedad } from 'src/modelos/propiedad/propiedad';
import { CrearPropiedadDto } from './dto/crear-propiedad.dto';
import { ActualizarPropiedadDto } from './dto/actualizar-propiedad.dto';
import { esAdmin } from 'src/middleware/seguridad/rol.helper';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class PropiedadesService {
  private propiedadRepository: Repository<Propiedad>;

  constructor(private readonly poolConexion: DataSource) {
    this.propiedadRepository = poolConexion.getRepository(Propiedad);
  }

  public async consultar(): Promise<Propiedad[]> {
    return this.propiedadRepository.find({ order: { createdAt: 'DESC' } });
  }

  public async consultarUno(id: number): Promise<Propiedad> {
    const propiedad = await this.propiedadRepository.findOneBy({
      codPropiedad: id,
    });

    if (!propiedad) {
      throw new HttpException('Propiedad no encontrada', HttpStatus.NOT_FOUND);
    }

    return propiedad;
  }

  public async registrar(
    datos: CrearPropiedadDto,
    datosUsuario: SesionUsuario,
  ): Promise<Propiedad> {
    const nuevaPropiedad = this.propiedadRepository.create({
      ...datos,
      codUsuario: Number(datosUsuario.sub),
      activo: true,
    });

    return this.propiedadRepository.save(nuevaPropiedad);
  }

  public async actualizar(
    id: number,
    datos: ActualizarPropiedadDto,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    const propiedad = await this.consultarUno(id);
    this.verificarPropietario(propiedad, datosUsuario);

    await this.propiedadRepository.update(id, datos);

    return { mensaje: 'Propiedad actualizada correctamente' };
  }

  public async eliminar(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    const propiedad = await this.consultarUno(id);
    this.verificarPropietario(propiedad, datosUsuario);

    await this.propiedadRepository.delete(id);

    return { mensaje: 'Propiedad eliminada correctamente' };
  }

  // Solo el dueño del anuncio o un admin pueden modificarlo/eliminarlo.
  private verificarPropietario(
    propiedad: Propiedad,
    datosUsuario: SesionUsuario,
  ): void {
    if (esAdmin(datosUsuario.nombre_rol)) {
      return;
    }

    if (propiedad.codUsuario !== Number(datosUsuario.sub)) {
      throw new ForbiddenException('No tienes permiso sobre esta propiedad');
    }
  }
}
