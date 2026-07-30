import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../usuario/usuario';

export enum PlanTipo {
  CASAS = 'CASAS',
  EDIFICIOS = 'EDIFICIOS',
  CONJUNTOS = 'CONJUNTOS',
}

@Entity('tenants', { schema: 'public' })
export class Tenant {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_tenant' })
  public codTenant!: number;

  @Column({ type: 'varchar', length: 250, nullable: false })
  public nombre!: string;

  @Column({ type: 'enum', enum: PlanTipo, default: PlanTipo.CASAS })
  public plan!: PlanTipo;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'color_primario',
    default: '#0d6efd',
  })
  public colorPrimario?: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'color_secundario',
    default: '#6c757d',
  })
  public colorSecundario?: string;

  @Column({ type: 'text', nullable: true, name: 'logo_url' })
  public logoUrl?: string;

  @Column({ type: 'boolean', default: true })
  public activo!: boolean;

  @OneToMany(() => Usuario, (objUsuario) => objUsuario.tenant)
  public usuarios?: Usuario[];

  @CreateDateColumn({ name: 'creado_en' })
  public creadoEn!: Date;
}
