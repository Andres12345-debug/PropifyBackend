import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { ReporteDano } from 'src/modelos/reporte-dano/reporte-dano';
import { Residente } from 'src/modelos/residente/residente';
import { Unidad } from 'src/modelos/unidad/unidad';
import { Inmueble } from 'src/modelos/inmueble/inmueble';
import { Usuario } from 'src/modelos/usuario/usuario';
import { CrearReporteDanoDto } from './dto/crear-reporte-dano.dto';
import { ActualizarReporteDanoDto } from './dto/actualizar-reporte-dano.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import {
  CanalNotificacion,
  TipoNotificacion,
} from 'src/modelos/notificacion-enviada/notificacion-enviada';
import {
  RoleNames,
  obtenerTenantId,
  obtenerUsuarioId,
  tieneRol,
} from 'src/middleware/seguridad/rol.helper';
import { verificarTenant } from 'src/middleware/seguridad/tenant.helper';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class ReportesDanoService {
  private reporteRepository: Repository<ReporteDano>;
  private residenteRepository: Repository<Residente>;
  private unidadRepository: Repository<Unidad>;
  private inmuebleRepository: Repository<Inmueble>;
  private usuarioRepository: Repository<Usuario>;

  constructor(
    private readonly poolConexion: DataSource,
    private readonly notificacionesService: NotificacionesService,
  ) {
    this.reporteRepository = poolConexion.getRepository(ReporteDano);
    this.residenteRepository = poolConexion.getRepository(Residente);
    this.unidadRepository = poolConexion.getRepository(Unidad);
    this.inmuebleRepository = poolConexion.getRepository(Inmueble);
    this.usuarioRepository = poolConexion.getRepository(Usuario);
  }

  private async resolverInmuebleDeResidente(
    residente: Residente,
  ): Promise<Inmueble> {
    const unidad = await this.unidadRepository.findOneBy({
      codUnidad: residente.codUnidad,
    });
    const inmueble = await this.inmuebleRepository.findOneBy({
      codInmueble: unidad!.codInmueble,
    });
    return inmueble!;
  }

  public async registrar(
    datos: CrearReporteDanoDto,
    datosUsuario: SesionUsuario,
  ): Promise<ReporteDano> {
    let residente: Residente | null;

    if (tieneRol(datosUsuario, RoleNames.RESIDENTE)) {
      residente = await this.residenteRepository.findOneBy({
        codUsuario: obtenerUsuarioId(datosUsuario)!,
      });
      if (!residente) {
        throw new HttpException(
          'No tienes un registro de residente asociado',
          HttpStatus.NOT_FOUND,
        );
      }
    } else {
      if (!datos.codResidente) {
        throw new HttpException(
          'codResidente es obligatorio',
          HttpStatus.BAD_REQUEST,
        );
      }
      residente = await this.residenteRepository.findOneBy({
        codResidente: datos.codResidente,
      });
      if (!residente) {
        throw new HttpException(
          'Residente no encontrado',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    const inmueble = await this.resolverInmuebleDeResidente(residente);
    verificarTenant(
      inmueble.codTenant,
      datosUsuario,
      'Residente no encontrado',
    );

    const nuevoReporte = this.reporteRepository.create({
      codUnidad: residente.codUnidad,
      codResidente: residente.codResidente,
      descripcion: datos.descripcion,
      fotoUrl: datos.fotoUrl,
    });
    const reporteGuardado = await this.reporteRepository.save(nuevoReporte);

    // Notificación instantánea al DUEÑO/ADMIN del inmueble.
    const destinatarios = await this.usuarioRepository
      .createQueryBuilder('usuario')
      .innerJoin('roles', 'rol', 'rol.cod_rol = usuario.cod_rol')
      .where('usuario.cod_tenant = :tenantId', {
        tenantId: obtenerTenantId(datosUsuario),
      })
      .andWhere('rol.nombre_rol IN (:...roles)', {
        roles: [RoleNames.DUENO, RoleNames.ADMIN],
      })
      .getMany();

    for (const destinatario of destinatarios) {
      await this.notificacionesService.enviar(
        TipoNotificacion.ALERTA_DANO,
        destinatario.correoUsuario,
        `Nuevo reporte de daño en la unidad ${residente.codUnidad}: ${datos.descripcion}`,
        undefined,
        CanalNotificacion.EMAIL,
      );
    }

    return reporteGuardado;
  }

  public async consultar(
    codUnidad: number,
    datosUsuario: SesionUsuario,
  ): Promise<ReporteDano[]> {
    const unidad = await this.unidadRepository.findOneBy({ codUnidad });
    if (!unidad) {
      throw new HttpException('Unidad no encontrada', HttpStatus.NOT_FOUND);
    }
    const inmueble = await this.inmuebleRepository.findOneBy({
      codInmueble: unidad.codInmueble,
    });
    verificarTenant(inmueble?.codTenant, datosUsuario, 'Unidad no encontrada');

    return this.reporteRepository.find({
      where: { codUnidad },
      order: { creadoEn: 'DESC' },
    });
  }

  public async actualizar(
    id: number,
    datos: ActualizarReporteDanoDto,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    const reporte = await this.reporteRepository.findOneBy({
      codReporte: id,
    });
    if (!reporte) {
      throw new HttpException('Reporte no encontrado', HttpStatus.NOT_FOUND);
    }
    const unidad = await this.unidadRepository.findOneBy({
      codUnidad: reporte.codUnidad,
    });
    const inmueble = await this.inmuebleRepository.findOneBy({
      codInmueble: unidad!.codInmueble,
    });
    verificarTenant(inmueble?.codTenant, datosUsuario, 'Reporte no encontrado');

    await this.reporteRepository.update(id, { estado: datos.estado });
    return { mensaje: 'Reporte actualizado correctamente' };
  }
}
