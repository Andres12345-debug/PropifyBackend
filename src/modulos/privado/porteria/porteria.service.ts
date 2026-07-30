import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  DataSource,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { Visita } from 'src/modelos/visita/visita';
import { AutorizacionPrevia } from 'src/modelos/autorizacion-previa/autorizacion-previa';
import { Paquete } from 'src/modelos/paquete/paquete';
import { Unidad } from 'src/modelos/unidad/unidad';
import { Inmueble } from 'src/modelos/inmueble/inmueble';
import { Residente } from 'src/modelos/residente/residente';
import { CrearVisitaDto } from './dto/crear-visita.dto';
import { CrearAutorizacionPreviaDto } from './dto/crear-autorizacion-previa.dto';
import { CrearPaqueteDto } from './dto/crear-paquete.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { TipoNotificacion } from 'src/modelos/notificacion-enviada/notificacion-enviada';
import { obtenerUsuarioId } from 'src/middleware/seguridad/rol.helper';
import { verificarTenant } from 'src/middleware/seguridad/tenant.helper';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class PorteriaService {
  private visitaRepository: Repository<Visita>;
  private autorizacionRepository: Repository<AutorizacionPrevia>;
  private paqueteRepository: Repository<Paquete>;
  private unidadRepository: Repository<Unidad>;
  private inmuebleRepository: Repository<Inmueble>;
  private residenteRepository: Repository<Residente>;

  constructor(
    private readonly poolConexion: DataSource,
    private readonly notificacionesService: NotificacionesService,
  ) {
    this.visitaRepository = poolConexion.getRepository(Visita);
    this.autorizacionRepository =
      poolConexion.getRepository(AutorizacionPrevia);
    this.paqueteRepository = poolConexion.getRepository(Paquete);
    this.unidadRepository = poolConexion.getRepository(Unidad);
    this.inmuebleRepository = poolConexion.getRepository(Inmueble);
    this.residenteRepository = poolConexion.getRepository(Residente);
  }

  private async verificarUnidadConCelador(
    codUnidad: number,
    datosUsuario: SesionUsuario,
  ): Promise<Unidad> {
    const unidad = await this.unidadRepository.findOneBy({ codUnidad });
    if (!unidad) {
      throw new HttpException('Unidad no encontrada', HttpStatus.NOT_FOUND);
    }
    const inmueble = await this.inmuebleRepository.findOneBy({
      codInmueble: unidad.codInmueble,
    });
    verificarTenant(inmueble?.codTenant, datosUsuario, 'Unidad no encontrada');
    if (!inmueble?.tieneCelador) {
      throw new HttpException(
        'Este inmueble no tiene el módulo de portería activo',
        HttpStatus.BAD_REQUEST,
      );
    }
    return unidad;
  }

  // ---------- Visitas ----------

  public async registrarEntradaVisita(
    datos: CrearVisitaDto,
    datosUsuario: SesionUsuario,
  ): Promise<Visita> {
    await this.verificarUnidadConCelador(datos.codUnidad, datosUsuario);

    const nuevaVisita = this.visitaRepository.create({
      ...datos,
      horaEntrada: new Date(),
      registradoPorId: obtenerUsuarioId(datosUsuario)!,
    });
    return this.visitaRepository.save(nuevaVisita);
  }

  public async registrarSalidaVisita(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    const visita = await this.visitaRepository.findOneBy({ codVisita: id });
    if (!visita) {
      throw new HttpException('Visita no encontrada', HttpStatus.NOT_FOUND);
    }
    await this.verificarUnidadConCelador(visita.codUnidad, datosUsuario);

    await this.visitaRepository.update(id, { horaSalida: new Date() });
    return { mensaje: 'Salida registrada correctamente' };
  }

  public async consultarVisitasPorUnidad(
    codUnidad: number,
    datosUsuario: SesionUsuario,
  ): Promise<Visita[]> {
    await this.verificarUnidadConCelador(codUnidad, datosUsuario);
    return this.visitaRepository.find({
      where: { codUnidad },
      order: { horaEntrada: 'DESC' },
    });
  }

  // ---------- Autorizaciones previas ----------

  private async obtenerResidentePropio(
    datosUsuario: SesionUsuario,
  ): Promise<Residente> {
    const residente = await this.residenteRepository.findOneBy({
      codUsuario: obtenerUsuarioId(datosUsuario)!,
    });
    if (!residente) {
      throw new HttpException(
        'No tienes un registro de residente asociado',
        HttpStatus.NOT_FOUND,
      );
    }
    return residente;
  }

  public async registrarAutorizacion(
    datos: CrearAutorizacionPreviaDto,
    datosUsuario: SesionUsuario,
  ): Promise<AutorizacionPrevia> {
    const residente = await this.obtenerResidentePropio(datosUsuario);

    if (new Date(datos.ventanaInicio) >= new Date(datos.ventanaFin)) {
      throw new HttpException(
        'ventanaInicio debe ser anterior a ventanaFin',
        HttpStatus.BAD_REQUEST,
      );
    }

    const nuevaAutorizacion = this.autorizacionRepository.create({
      ...datos,
      codUnidad: residente.codUnidad,
      codResidente: residente.codResidente,
      ventanaInicio: new Date(datos.ventanaInicio),
      ventanaFin: new Date(datos.ventanaFin),
    });
    return this.autorizacionRepository.save(nuevaAutorizacion);
  }

  // Usado por el celador al recibir un visitante: autorizaciones vigentes
  // AHORA MISMO (ventanaInicio ya empezó y ventanaFin no ha vencido). Antes
  // solo se exigía ventanaFin >= ahora, así que una autorización con
  // ventana futura ("visita el sábado") aparecía como vigente desde el
  // momento en que se creaba.
  public async consultarAutorizacionesVigentes(
    codUnidad: number,
    datosUsuario: SesionUsuario,
  ): Promise<AutorizacionPrevia[]> {
    await this.verificarUnidadConCelador(codUnidad, datosUsuario);
    const ahora = new Date();
    return this.autorizacionRepository.find({
      where: {
        codUnidad,
        ventanaInicio: LessThanOrEqual(ahora),
        ventanaFin: MoreThanOrEqual(ahora),
      },
      order: { ventanaInicio: 'ASC' },
    });
  }

  // ---------- Paquetes ----------

  public async registrarLlegadaPaquete(
    datos: CrearPaqueteDto,
    datosUsuario: SesionUsuario,
  ): Promise<Paquete> {
    await this.verificarUnidadConCelador(datos.codUnidad, datosUsuario);

    const nuevoPaquete = this.paqueteRepository.create({
      ...datos,
      horaLlegada: new Date(),
      registradoPorId: obtenerUsuarioId(datosUsuario)!,
    });
    const paqueteGuardado = await this.paqueteRepository.save(nuevoPaquete);

    // Notificación instantánea a los residentes activos de la unidad.
    const residentes = await this.residenteRepository.find({
      where: { codUnidad: datos.codUnidad, activo: true },
    });
    for (const residente of residentes) {
      await this.notificacionesService.enviar(
        TipoNotificacion.PAQUETE,
        residente.telefono,
        `Tienes un paquete nuevo en portería${datos.descripcion ? `: ${datos.descripcion}` : ''}.`,
      );
    }
    if (residentes.length > 0) {
      await this.paqueteRepository.update(paqueteGuardado.codPaquete, {
        notificado: true,
      });
    }

    return paqueteGuardado;
  }

  public async registrarEntregaPaquete(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    const paquete = await this.paqueteRepository.findOneBy({ codPaquete: id });
    if (!paquete) {
      throw new HttpException('Paquete no encontrado', HttpStatus.NOT_FOUND);
    }
    await this.verificarUnidadConCelador(paquete.codUnidad, datosUsuario);

    await this.paqueteRepository.update(id, { horaRetiro: new Date() });
    return { mensaje: 'Paquete marcado como entregado' };
  }

  public async consultarPaquetesPorUnidad(
    codUnidad: number,
    datosUsuario: SesionUsuario,
  ): Promise<Paquete[]> {
    await this.verificarUnidadConCelador(codUnidad, datosUsuario);
    return this.paqueteRepository.find({
      where: { codUnidad },
      order: { horaLlegada: 'DESC' },
    });
  }
}
