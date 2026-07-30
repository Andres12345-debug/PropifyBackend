import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Unidad } from '../unidad/unidad';
import { Usuario } from '../usuario/usuario';

@Entity('visitas', { schema: 'public' })
export class Visita {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_visita' })
  public codVisita!: number;

  @Column({ type: 'integer', nullable: false, name: 'cod_unidad' })
  public codUnidad!: number;

  @ManyToOne(() => Unidad, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cod_unidad', referencedColumnName: 'codUnidad' })
  public unidad?: Unidad;

  @Column({
    type: 'varchar',
    length: 250,
    nullable: false,
    name: 'nombre_visitante',
  })
  public nombreVisitante!: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'cedula_visitante',
  })
  public cedulaVisitante?: string;

  @Column({ type: 'timestamp', nullable: false, name: 'hora_entrada' })
  public horaEntrada!: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'hora_salida' })
  public horaSalida?: Date;

  @Column({ type: 'integer', nullable: false, name: 'registrado_por_id' })
  public registradoPorId!: number;

  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'registrado_por_id', referencedColumnName: 'codUsuario' })
  public registradoPor?: Usuario;
}
