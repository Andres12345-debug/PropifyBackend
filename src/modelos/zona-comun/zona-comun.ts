import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Inmueble } from '../inmueble/inmueble';

@Entity('zonas_comunes', { schema: 'public' })
export class ZonaComun {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_zona' })
  public codZona!: number;

  @Column({ type: 'integer', nullable: false, name: 'cod_inmueble' })
  public codInmueble!: number;

  @ManyToOne(() => Inmueble, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cod_inmueble', referencedColumnName: 'codInmueble' })
  public inmueble?: Inmueble;

  @Column({ type: 'varchar', length: 250, nullable: false })
  public nombre!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  public precio!: number;

  @Column({ type: 'integer', nullable: true })
  public capacidad?: number;

  @Column({ type: 'varchar', length: 5, nullable: true, name: 'hora_apertura' })
  public horaApertura?: string;

  @Column({ type: 'varchar', length: 5, nullable: true, name: 'hora_cierre' })
  public horaCierre?: string;

  @Column({ type: 'boolean', default: true })
  public activa!: boolean;
}
