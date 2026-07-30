import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Unidad } from '../unidad/unidad';
import { Residente } from '../residente/residente';

export enum EstadoReporte {
  PENDIENTE = 'PENDIENTE',
  EN_PROCESO = 'EN_PROCESO',
  RESUELTO = 'RESUELTO',
}

@Entity('reportes_dano', { schema: 'public' })
export class ReporteDano {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_reporte' })
  public codReporte!: number;

  @Column({ type: 'integer', nullable: false, name: 'cod_unidad' })
  public codUnidad!: number;

  @ManyToOne(() => Unidad, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cod_unidad', referencedColumnName: 'codUnidad' })
  public unidad?: Unidad;

  @Column({ type: 'integer', nullable: false, name: 'cod_residente' })
  public codResidente!: number;

  @ManyToOne(() => Residente, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cod_residente', referencedColumnName: 'codResidente' })
  public residente?: Residente;

  @Column({ type: 'text', nullable: false })
  public descripcion!: string;

  @Column({ type: 'text', nullable: true, name: 'foto_url' })
  public fotoUrl?: string;

  @Column({
    type: 'enum',
    enum: EstadoReporte,
    default: EstadoReporte.PENDIENTE,
  })
  public estado!: EstadoReporte;

  @CreateDateColumn({ name: 'creado_en' })
  public creadoEn!: Date;
}
