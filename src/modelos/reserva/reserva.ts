import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ZonaComun } from '../zona-comun/zona-comun';
import { Residente } from '../residente/residente';

export enum EstadoReserva {
  CONFIRMADA = 'CONFIRMADA',
  CANCELADA = 'CANCELADA',
}

@Entity('reservas', { schema: 'public' })
export class Reserva {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_reserva' })
  public codReserva!: number;

  @Column({ type: 'integer', nullable: false, name: 'cod_zona' })
  public codZona!: number;

  @ManyToOne(() => ZonaComun, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cod_zona', referencedColumnName: 'codZona' })
  public zona?: ZonaComun;

  @Column({ type: 'integer', nullable: false, name: 'cod_residente' })
  public codResidente!: number;

  @ManyToOne(() => Residente, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cod_residente', referencedColumnName: 'codResidente' })
  public residente?: Residente;

  @Column({ type: 'timestamp', nullable: false })
  public fecha!: Date;

  @Column({ type: 'varchar', length: 5, nullable: false, name: 'hora_inicio' })
  public horaInicio!: string;

  @Column({ type: 'varchar', length: 5, nullable: false, name: 'hora_fin' })
  public horaFin!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  public costo!: number;

  @Column({
    type: 'enum',
    enum: EstadoReserva,
    default: EstadoReserva.CONFIRMADA,
  })
  public estado!: EstadoReserva;

  // Marca si ya se facturó como CargoDetalle en un ciclo de cobranza —
  // evita que el cron la vuelva a cobrar en un periodo posterior.
  @Column({ type: 'boolean', default: false, name: 'facturada' })
  public facturada!: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  public creadoEn!: Date;
}
