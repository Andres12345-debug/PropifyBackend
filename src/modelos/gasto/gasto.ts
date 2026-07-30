import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Inmueble } from '../inmueble/inmueble';

@Entity('gastos', { schema: 'public' })
export class Gasto {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_gasto' })
  public codGasto!: number;

  @Column({ type: 'integer', nullable: false, name: 'cod_inmueble' })
  public codInmueble!: number;

  @ManyToOne(() => Inmueble, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cod_inmueble', referencedColumnName: 'codInmueble' })
  public inmueble?: Inmueble;

  @Column({ type: 'varchar', length: 250, nullable: false })
  public concepto!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: false })
  public monto!: number;

  @Column({ type: 'timestamp', nullable: false })
  public fecha!: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  public categoria?: string;
}
