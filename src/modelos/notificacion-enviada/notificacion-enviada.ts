import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum TipoNotificacion {
  RECORDATORIO_PAGO = 'RECORDATORIO_PAGO',
  MORA = 'MORA',
  PAQUETE = 'PAQUETE',
  AVISO = 'AVISO',
  ALERTA_DANO = 'ALERTA_DANO',
  VENCIMIENTO_CONTRATO = 'VENCIMIENTO_CONTRATO',
}

export enum CanalNotificacion {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

@Entity('notificaciones_enviadas', { schema: 'public' })
export class NotificacionEnviada {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_notificacion' })
  public codNotificacion!: number;

  @Column({ type: 'integer', nullable: true, name: 'cod_cuenta' })
  public codCuenta?: number;

  // Para notificaciones que no cuelgan de una cuenta de cobro (ej. aviso de
  // vencimiento de contrato al dueño) — permite chequear idempotencia por
  // residente en vez de por cuenta.
  @Column({ type: 'integer', nullable: true, name: 'cod_residente' })
  public codResidente?: number;

  @Column({ type: 'enum', enum: TipoNotificacion })
  public tipo!: TipoNotificacion;

  @Column({
    type: 'enum',
    enum: CanalNotificacion,
    default: CanalNotificacion.WHATSAPP,
  })
  public canal!: CanalNotificacion;

  @Column({ type: 'varchar', length: 250, nullable: false })
  public destinatario!: string;

  @Column({ type: 'text', nullable: true })
  public contenido?: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'enviado_en',
  })
  public enviadoEn!: Date;
}
