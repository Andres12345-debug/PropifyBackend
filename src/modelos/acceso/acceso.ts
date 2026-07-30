import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Usuario } from '../usuario/usuario';

@Entity('accesos', { schema: 'public' })
export class Acceso {
  @PrimaryColumn({ type: 'integer', nullable: false, name: 'cod_usuario' })
  public codUsuario!: number;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: false,
    name: 'clave_acceso',
  })
  public claveAcceso!: string;

  @OneToOne(() => Usuario, (objUsuario) => objUsuario.acceso, {
    onDelete: 'RESTRICT', // El acceso nunca puede quedar huérfano de su usuario
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'cod_usuario' })
  public usuario!: Usuario;
}
