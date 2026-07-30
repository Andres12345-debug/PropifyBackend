import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Inmueble } from '../inmueble/inmueble';
import { Unidad } from '../unidad/unidad';

@Entity('parqueaderos', { schema: 'public' })
@Unique(['codInmueble', 'numero'])
export class Parqueadero {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_parqueadero' })
  public codParqueadero!: number;

  @Column({ type: 'integer', nullable: false, name: 'cod_inmueble' })
  public codInmueble!: number;

  @ManyToOne(() => Inmueble, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cod_inmueble', referencedColumnName: 'codInmueble' })
  public inmueble?: Inmueble;

  @Column({ type: 'varchar', length: 50, nullable: false })
  public numero!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  public tipo?: string;

  // Opcional: un parqueadero puede existir sin estar asignado todavía.
  @Column({ type: 'integer', nullable: true, name: 'cod_unidad' })
  public codUnidad?: number;

  @ManyToOne(() => Unidad, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cod_unidad', referencedColumnName: 'codUnidad' })
  public unidad?: Unidad;
}
