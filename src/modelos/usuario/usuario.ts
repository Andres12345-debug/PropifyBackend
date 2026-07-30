import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Acceso } from '../acceso/acceso';
import { Rol } from '../rol/rol';
import { Tenant } from '../tenant/tenant';

@Entity('usuarios', { schema: 'public' })
export class Usuario {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_usuario' })
  public codUsuario!: number;
  // Nullable únicamente para el rol superadministrador: es el único usuario
  // que no pertenece a ningún tenant (control total de la plataforma).
  @Column({ type: 'integer', nullable: true, name: 'cod_tenant' })
  public codTenant?: number | null;
  @Column({ type: 'integer', nullable: false, name: 'cod_rol' })
  public codRol!: number;
  @Column({
    type: 'varchar',
    length: 250,
    nullable: false,
    name: 'nombre_usuario',
  })
  public nombreUsuario!: string;
  @Column({
    type: 'varchar',
    length: 250,
    unique: true,
    nullable: false,
    name: 'correo_usuario',
  })
  public correoUsuario!: string;

  // Relación con Acceso
  @OneToOne(() => Acceso, (objAcceso) => objAcceso.usuario)
  public acceso?: Acceso;
  //Relacion con Roles mando
  @ManyToOne(() => Rol, (objRol: Rol) => objRol.usuarios, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'cod_rol', referencedColumnName: 'codRol' })
  public codRolU?: Rol;

  // Relación con Tenant — todo usuario pertenece a un único tenant (regla de
  // oro: toda consulta del backend debe filtrar por este campo), salvo el
  // superadministrador, que no pertenece a ninguno.
  @ManyToOne(() => Tenant, (objTenant) => objTenant.usuarios, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'cod_tenant', referencedColumnName: 'codTenant' })
  public tenant?: Tenant;
}
