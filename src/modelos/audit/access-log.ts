import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '../usuario/usuario';

export enum AuditEvent {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAIL = 'LOGIN_FAIL',
  REGISTER = 'REGISTER',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
}

@Entity('access_logs', { schema: 'public' })
export class AccessLog {
  @PrimaryGeneratedColumn()
  id!: number;

  // Nullable: intentos fallidos de usuarios inexistentes tendrán null.
  // onDelete: SET NULL — si el usuario se elimina, el log histórico se preserva.
  @Column({ type: 'integer', nullable: true, name: 'cod_usuario' })
  codUsuario?: number;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cod_usuario', referencedColumnName: 'codUsuario' })
  usuario?: Usuario;

  @Column({ type: 'enum', enum: AuditEvent })
  event!: AuditEvent;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'text', nullable: true })
  details?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
