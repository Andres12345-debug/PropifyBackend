import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  CanalNotificacion,
  NotificacionEnviada,
  TipoNotificacion,
} from 'src/modelos/notificacion-enviada/notificacion-enviada';

// Punto único de envío de notificaciones. Hoy es un stub: registra el envío
// en NotificacionEnviada y lo loguea, sin proveedor real de WhatsApp/SMS/
// email todavía. El día que se integre Twilio/Meta Cloud API, solo cambia
// el cuerpo de `enviar()` — nada del resto del código (cobranza, portería,
// cartelera, reportes de daño) necesita tocarse.
@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);
  private notificacionRepository: Repository<NotificacionEnviada>;

  constructor(private readonly poolConexion: DataSource) {
    this.notificacionRepository =
      poolConexion.getRepository(NotificacionEnviada);
  }

  public async enviar(
    tipo: TipoNotificacion,
    destinatario: string,
    contenido: string,
    codCuenta?: number,
    canal: CanalNotificacion = CanalNotificacion.WHATSAPP,
    codResidente?: number,
  ): Promise<NotificacionEnviada> {
    this.logger.log(`[stub ${canal}] ${tipo} -> ${destinatario}: ${contenido}`);

    const registro = this.notificacionRepository.create({
      tipo,
      canal,
      destinatario,
      contenido,
      codCuenta,
      codResidente,
    });

    return this.notificacionRepository.save(registro);
  }

  // Idempotencia (spec §4.6): evita reenviar el mismo aviso el mismo día si
  // el cron se re-ejecuta o falla a mitad de camino.
  public async yaSeEnvioHoy(
    codCuenta: number,
    tipo: TipoNotificacion,
  ): Promise<boolean> {
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);

    const existente = await this.notificacionRepository
      .createQueryBuilder('n')
      .where('n.cod_cuenta = :codCuenta', { codCuenta })
      .andWhere('n.tipo = :tipo', { tipo })
      .andWhere('n.enviado_en >= :inicioDia', { inicioDia })
      .getOne();

    return !!existente;
  }

  // Igual que yaSeEnvioHoy, pero para notificaciones ligadas a un residente
  // en vez de a una cuenta (ej. aviso de vencimiento de contrato).
  public async yaSeEnvioHoyResidente(
    codResidente: number,
    tipo: TipoNotificacion,
  ): Promise<boolean> {
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);

    const existente = await this.notificacionRepository
      .createQueryBuilder('n')
      .where('n.cod_residente = :codResidente', { codResidente })
      .andWhere('n.tipo = :tipo', { tipo })
      .andWhere('n.enviado_en >= :inicioDia', { inicioDia })
      .getOne();

    return !!existente;
  }
}
