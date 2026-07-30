import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CuentaMensual } from '../cuenta-mensual/cuenta-mensual';

@Entity('pagos', { schema: 'public' })
export class Pago {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_pago' })
  public codPago!: number;

  @Column({ type: 'integer', nullable: false, name: 'cod_cuenta' })
  public codCuenta!: number;

  @ManyToOne(() => CuentaMensual, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'cod_cuenta', referencedColumnName: 'codCuenta' })
  public cuenta?: CuentaMensual;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: false })
  public monto!: number;

  @Column({ type: 'timestamp', nullable: false })
  public fecha!: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  public metodo?: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  public referencia?: string;
}
