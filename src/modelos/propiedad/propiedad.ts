import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../usuario/usuario';

export enum TipoOperacion {
  VENTA = 'venta',
  ARRIENDO = 'arriendo',
}

export enum TipoInmueble {
  CASA = 'casa',
  APARTAMENTO = 'apartamento',
  LOCAL = 'local',
  LOTE = 'lote',
}

@Entity('propiedades', { schema: 'public' })
export class Propiedad {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_propiedad' })
  public codPropiedad!: number;

  @Column({ type: 'varchar', length: 250, nullable: false })
  public titulo!: string;

  @Column({ type: 'text', nullable: true })
  public descripcion?: string;

  @Column({ type: 'varchar', length: 500, nullable: false })
  public direccion!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: false })
  public precio!: number;

  @Column({ type: 'enum', enum: TipoOperacion, name: 'tipo_operacion' })
  public tipoOperacion!: TipoOperacion;

  @Column({ type: 'enum', enum: TipoInmueble, name: 'tipo_inmueble' })
  public tipoInmueble!: TipoInmueble;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  public area?: number;

  @Column({ type: 'integer', nullable: true })
  public habitaciones?: number;

  @Column({ type: 'integer', nullable: true })
  public banos?: number;

  @Column({ type: 'boolean', default: true, name: 'activo' })
  public activo!: boolean;

  // Dueño/creador del anuncio. Quien lo publicó — usado para el chequeo de
  // propiedad (solo su dueño o un admin pueden editar/eliminar).
  @Column({ type: 'integer', nullable: false, name: 'cod_usuario' })
  public codUsuario!: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cod_usuario', referencedColumnName: 'codUsuario' })
  public usuario?: Usuario;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt!: Date;
}
