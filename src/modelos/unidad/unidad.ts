import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Inmueble } from '../inmueble/inmueble';
import { Torre } from '../torre/torre';

export enum TipoUnidad {
  APARTAMENTO = 'APARTAMENTO',
  APARTAESTUDIO = 'APARTAESTUDIO',
  HABITACION = 'HABITACION',
  LOCAL = 'LOCAL',
  OFICINA = 'OFICINA',
}

@Entity('unidades', { schema: 'public' })
@Unique(['codInmueble', 'codTorre', 'identificador'])
export class Unidad {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_unidad' })
  public codUnidad!: number;

  @Column({ type: 'integer', nullable: false, name: 'cod_inmueble' })
  public codInmueble!: number;

  @ManyToOne(() => Inmueble, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cod_inmueble', referencedColumnName: 'codInmueble' })
  public inmueble?: Inmueble;

  // Nulo para "Casa Adaptada" (inmuebles sin tieneTorres) — todas sus
  // unidades cuelgan directo del inmueble.
  @Column({ type: 'integer', nullable: true, name: 'cod_torre' })
  public codTorre?: number;

  @ManyToOne(() => Torre, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cod_torre', referencedColumnName: 'codTorre' })
  public torre?: Torre;

  @Column({ type: 'varchar', length: 100, nullable: false })
  public identificador!: string;

  @Column({ type: 'integer', nullable: true })
  public piso?: number;

  @Column({
    type: 'enum',
    enum: TipoUnidad,
    default: TipoUnidad.APARTAMENTO,
  })
  public tipo!: TipoUnidad;

  @Column({
    type: 'numeric',
    precision: 8,
    scale: 2,
    nullable: true,
    name: 'area_m2',
  })
  public areaM2?: number;

  @CreateDateColumn({ name: 'creado_en' })
  public creadoEn!: Date;
}
