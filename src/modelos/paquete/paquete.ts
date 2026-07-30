import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Unidad } from '../unidad/unidad';
import { Usuario } from '../usuario/usuario';

@Entity('paquetes', { schema: 'public' })
export class Paquete {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_paquete' })
  public codPaquete!: number;

  @Column({ type: 'integer', nullable: false, name: 'cod_unidad' })
  public codUnidad!: number;

  @ManyToOne(() => Unidad, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cod_unidad', referencedColumnName: 'codUnidad' })
  public unidad?: Unidad;

  @Column({ type: 'text', nullable: true })
  public descripcion?: string;

  @Column({ type: 'timestamp', nullable: false, name: 'hora_llegada' })
  public horaLlegada!: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'hora_retiro' })
  public horaRetiro?: Date;

  @Column({ type: 'integer', nullable: false, name: 'registrado_por_id' })
  public registradoPorId!: number;

  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'registrado_por_id', referencedColumnName: 'codUsuario' })
  public registradoPor?: Usuario;

  @Column({ type: 'boolean', default: false })
  public notificado!: boolean;
}
