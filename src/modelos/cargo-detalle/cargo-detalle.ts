import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CuentaMensual } from '../cuenta-mensual/cuenta-mensual';

export enum TipoCargo {
  ARRIENDO = 'ARRIENDO',
  CUOTA_ADMINISTRACION = 'CUOTA_ADMINISTRACION',
  RESERVA_ZONA = 'RESERVA_ZONA',
  MULTA = 'MULTA',
  OTRO = 'OTRO',
}

@Entity('cargos_detalle', { schema: 'public' })
export class CargoDetalle {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_cargo' })
  public codCargo!: number;

  @Column({ type: 'integer', nullable: false, name: 'cod_cuenta' })
  public codCuenta!: number;

  @ManyToOne(() => CuentaMensual, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'cod_cuenta', referencedColumnName: 'codCuenta' })
  public cuenta?: CuentaMensual;

  @Column({ type: 'varchar', length: 250, nullable: false })
  public concepto!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: false })
  public monto!: number;

  @Column({ type: 'enum', enum: TipoCargo, default: TipoCargo.OTRO })
  public tipo!: TipoCargo;

  @CreateDateColumn({ name: 'creado_en' })
  public creadoEn!: Date;
}
