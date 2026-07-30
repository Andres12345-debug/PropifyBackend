import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../usuario/usuario';

@Entity('roles', { schema: 'public' })
export class Rol {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_rol' })
  public codRol!: number;

  @Column({ type: 'varchar', name: 'nombre_rol', length: 250, nullable: false })
  public nombreRol!: string;

  @Column({ type: 'integer', name: 'estado_rol', default: 1, nullable: false })
  public estadoRol!: number;

  @OneToMany(() => Usuario, (objUsuario) => objUsuario.codRolU)
  public usuarios?: Usuario[];
}
