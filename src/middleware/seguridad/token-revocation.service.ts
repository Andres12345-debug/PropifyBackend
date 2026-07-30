import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource, LessThan, Repository } from 'typeorm';
import { RevokedToken } from 'src/modelos/audit/revoked-token';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hora

@Injectable()
export class TokenRevocationService implements OnModuleInit, OnModuleDestroy {
  private repo: Repository<RevokedToken>;
  private cleanupHandle?: ReturnType<typeof setInterval>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(RevokedToken);
  }

  onModuleInit() {
    this.cleanupHandle = setInterval(() => {
      void this.repo.delete({ expiresAt: LessThan(new Date()) });
    }, CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.cleanupHandle) clearInterval(this.cleanupHandle);
  }

  public async revocar(jti: string, expiresAt: Date): Promise<void> {
    await this.repo.upsert({ jti, expiresAt }, ['jti']);
  }

  public async estaRevocado(jti: string): Promise<boolean> {
    const entry = await this.repo.findOne({ where: { jti } });
    return !!entry;
  }
}
