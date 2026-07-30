import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Residente } from '../residente/residente';

export enum EstadoCuenta {
  PENDIENTE = 'PENDIENTE',
  PAGADA = 'PAGADA',
  VENCIDA = 'VENCIDA',
}

@Entity('cuentas_mensuales', { schema: 'public' })
@Unique(['codResidente', 'periodo'])
export class CuentaMensual {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_cuenta' })
  public codCuenta!: number;

  @Column({ type: 'integer', nullable: false, name: 'cod_residente' })
  public codResidente!: number;

  @ManyToOne(() => Residente, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cod_residente', referencedColumnName: 'codResidente' })
  public residente?: Residente;

  // Periodo del ciclo de cobranza, formato YYYY-MM.
  @Column({ type: 'varchar', length: 7, nullable: false })
  public periodo!: string;

  @Column({ type: 'timestamp', nullable: false, name: 'fecha_vencimiento' })
  public fechaVencimiento!: Date;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  public total!: number;

  @Column({
    type: 'enum',
    enum: EstadoCuenta,
    default: EstadoCuenta.PENDIENTE,
  })
  public estado!: EstadoCuenta;

  @CreateDateColumn({ name: 'creado_en' })
  public creadoEn!: Date;
}
