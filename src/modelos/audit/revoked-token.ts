import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('revoked_tokens', { schema: 'public' })
export class RevokedToken {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  jti!: string;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;
}
