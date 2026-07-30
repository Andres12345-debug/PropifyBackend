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

  @Column({ type: 'varchar', length: 36, unique: true })
  token!: string; // UUID

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
