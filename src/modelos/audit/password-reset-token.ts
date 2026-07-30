import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '../usuario/usuario';

@Entity('password_reset_tokens', { schema: 'public' })
export class PasswordResetToken {
  @PrimaryGeneratedColumn()
  id!: number;

  // Hash SHA-256 (hex, 64 chars) del token UUID enviado por correo — nunca
  // se guarda el token en texto plano, para que una fuga de esta tabla no
  // exponga enlaces de reset todavía válidos.
  @Column({ type: 'varchar', length: 64, unique: true })
  token!: string;

  @Column({ type: 'integer' })
  userId!: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'userId' })
  usuario!: Usuario;

  @Column({ type: 'boolean', default: false })
  used!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;
}
