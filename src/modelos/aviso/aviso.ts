import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Inmueble } from '../inmueble/inmueble';
import { Usuario } from '../usuario/usuario';

@Entity('avisos', { schema: 'public' })
export class Aviso {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cod_aviso' })
  public codAviso!: number;

  @Column({ type: 'integer', nullable: false, name: 'cod_inmueble' })
  public codInmueble!: number;

  @ManyToOne(() => Inmueble, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cod_inmueble', referencedColumnName: 'codInmueble' })
  public inmueble?: Inmueble;

  @Column({ type: 'varchar', length: 250, nullable: false })
  public titulo!: string;

  @Column({ type: 'text', nullable: false })
  public mensaje!: string;

  @Column({ type: 'integer', nullable: false, name: 'publicado_por_id' })
  public publicadoPorId!: number;

  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'publicado_por_id', referencedColumnName: 'codUsuario' })
  public publicadoPor?: Usuario;

  @CreateDateColumn({ name: 'creado_en' })
  public creadoEn!: Date;
}
