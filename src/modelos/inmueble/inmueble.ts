import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from '../tenant/tenant';

@Entity('inmuebles', { schema: 'public' })
export class Inmueble {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_inmueble' })
  public codInmueble!: number;

  @Column({ type: 'integer', nullable: false, name: 'cod_tenant' })
  public codTenant!: number;

  @ManyToOne(() => Tenant, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cod_tenant', referencedColumnName: 'codTenant' })
  public tenant?: Tenant;

  @Column({ type: 'varchar', length: 250, nullable: false })
  public nombre!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  public direccion?: string;

  // Banderas de módulo — controlan qué se muestra en la UI y qué endpoints
  // tienen sentido usar; el plan del tenant solo las pre-marca al crear.
  @Column({ type: 'boolean', default: false, name: 'tiene_torres' })
  public tieneTorres!: boolean;

  @Column({ type: 'boolean', default: false, name: 'tiene_zonas_comunes' })
  public tieneZonasComunes!: boolean;

  @Column({ type: 'boolean', default: false, name: 'tiene_parqueaderos' })
  public tieneParqueaderos!: boolean;

  @Column({ type: 'boolean', default: false, name: 'tiene_celador' })
  public tieneCelador!: boolean;

  @Column({ type: 'boolean', default: false, name: 'tiene_cartelera' })
  public tieneCartelera!: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  public creadoEn!: Date;
}
