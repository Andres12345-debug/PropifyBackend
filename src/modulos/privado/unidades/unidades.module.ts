import { Module } from '@nestjs/common';
import { UnidadesService } from './unidades.service';
import { UnidadesController } from './unidades.controller';

@Module({
  providers: [UnidadesService],
  controllers: [UnidadesController],
})
export class UnidadesModule {}
