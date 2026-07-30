import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Inmueble } from '../inmueble/inmueble';

@Entity('torres', { schema: 'public' })
export class Torre {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_torre' })
  public codTorre!: number;

  @Column({ type: 'integer', nullable: false, name: 'cod_inmueble' })
  public codInmueble!: number;

  @ManyToOne(() => Inmueble, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cod_inmueble', referencedColumnName: 'codInmueble' })
  public inmueble?: Inmueble;

  @Column({ type: 'varchar', length: 250, nullable: false })
  public nombre!: string;

  @Column({ type: 'integer', nullable: true, name: 'numero_pisos' })
  public numeroPisos?: number;
}
