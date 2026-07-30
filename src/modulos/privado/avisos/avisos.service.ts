import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Aviso } from 'src/modelos/aviso/aviso';
import { Inmueble } from 'src/modelos/inmueble/inmueble';
import { Residente } from 'src/modelos/residente/residente';
import { CrearAvisoDto } from './dto/crear-aviso.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { TipoNotificacion } from 'src/modelos/notificacion-enviada/notificacion-enviada';
import { obtenerUsuarioId } from 'src/middleware/seguridad/rol.helper';
import { verificarTenant } from 'src/middleware/seguridad/tenant.helper';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class AvisosService {
  private avisoRepository: Repository<Aviso>;
  private inmuebleRepository: Repository<Inmueble>;
  private residenteRepository: Repository<Residente>;

  constructor(
    private readonly poolConexion: DataSource,
    private readonly notificacionesService: NotificacionesService,
  ) {
    this.avisoRepository = poolConexion.getRepository(Aviso);
    this.inmuebleRepository = poolConexion.getRepository(Inmueble);
    this.residenteRepository = poolConexion.getRepository(Residente);
  }

  public async consultar(
    codInmueble: number,
    datosUsuario: SesionUsuario,
  ): Promise<Aviso[]> {
    const inmueble = await this.inmuebleRepository.findOneBy({ codInmueble });
    if (!inmueble) {
      throw new HttpException('Inmueble no encontrado', HttpStatus.NOT_FOUND);
    }
    verificarTenant(inmueble.codTenant, datosUsuario, 'Inmueble no encontrado');

    return this.avisoRepository.find({
      where: { codInmueble },
      order: { creadoEn: 'DESC' },
    });
  }

  public async registrar(
    datos: CrearAvisoDto,
    datosUsuario: SesionUsuario,
  ): Promise<Aviso> {
    const inmueble = await this.inmuebleRepository.findOneBy({
      codInmueble: datos.codInmueble,
    });
    if (!inmueble) {
      throw new HttpException('Inmueble no encontrado', HttpStatus.NOT_FOUND);
    }
    verificarTenant(inmueble.codTenant, datosUsuario, 'Inmueble no encontrado');
    if (!inmueble.tieneCartelera) {
      throw new HttpException(
        'Este inmueble no tiene el módulo de cartelera activo',
        HttpStatus.BAD_REQUEST,
      );
    }

    const nuevoAviso = this.avisoRepository.create({
      ...datos,
      publicadoPorId: obtenerUsuarioId(datosUsuario)!,
    });
    const avisoGuardado = await this.avisoRepository.save(nuevoAviso);

    // Notificación instantánea a todos los residentes activos del inmueble.
    const residentes = await this.residenteRepository
      .createQueryBuilder('residente')
      .innerJoin(
        'unidades',
        'unidad',
        'unidad.cod_unidad = residente.cod_unidad',
      )
      .where('unidad.cod_inmueble = :codInmueble', {
        codInmueble: datos.codInmueble,
      })
      .andWhere('residente.activo = true')
      .getMany();

    for (const residente of residentes) {
      await this.notificacionesService.enviar(
        TipoNotificacion.AVISO,
        residente.telefono,
        `${datos.titulo}: ${datos.mensaje}`,
      );
    }

    return avisoGuardado;
  }
}
