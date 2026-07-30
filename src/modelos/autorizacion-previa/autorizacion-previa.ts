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

@Entity('autorizaciones_previas', { schema: 'public' })
export class AutorizacionPrevia {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_autorizacion' })
  public codAutorizacion!: number;

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

  @Column({
    type: 'varchar',
    length: 250,
    nullable: false,
    name: 'nombre_esperado',
  })
  public nombreEsperado!: string;

  @Column({ type: 'text', nullable: true })
  public notas?: string;

  @Column({ type: 'timestamp', nullable: false, name: 'ventana_inicio' })
  public ventanaInicio!: Date;

  @Column({ type: 'timestamp', nullable: false, name: 'ventana_fin' })
  public ventanaFin!: Date;

  @CreateDateColumn({ name: 'creado_en' })
  public creadoEn!: Date;
}
