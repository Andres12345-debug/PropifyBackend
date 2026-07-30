import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Unidad } from '../unidad/unidad';
import { Usuario } from '../usuario/usuario';

@Entity('residentes', { schema: 'public' })
export class Residente {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_residente' })
  public codResidente!: number;

  @Column({ type: 'integer', nullable: false, name: 'cod_unidad' })
  public codUnidad!: number;

  @ManyToOne(() => Unidad, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cod_unidad', referencedColumnName: 'codUnidad' })
  public unidad?: Unidad;

  // Opcional: solo si el residente tiene acceso al portal (login propio).
  @Column({ type: 'integer', nullable: true, name: 'cod_usuario' })
  public codUsuario?: number;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cod_usuario', referencedColumnName: 'codUsuario' })
  public usuario?: Usuario;

  @Column({ type: 'varchar', length: 250, nullable: false })
  public nombre!: string;

  @Column({ type: 'varchar', length: 30, nullable: false })
  public telefono!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  public cedula?: string;

  @Column({ type: 'boolean', default: false, name: 'es_propietario' })
  public esPropietario!: boolean;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: false,
    name: 'valor_mensual',
  })
  public valorMensual!: number;

  @Column({ type: 'integer', nullable: false, name: 'dia_pago' })
  public diaPago!: number;

  @Column({ type: 'timestamp', nullable: false, name: 'fecha_inicio' })
  public fechaInicio!: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'fecha_fin' })
  public fechaFin?: Date;

  @Column({ type: 'boolean', default: true })
  public activo!: boolean;
}
