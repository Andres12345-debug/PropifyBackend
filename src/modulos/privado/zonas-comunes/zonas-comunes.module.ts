import { Module } from '@nestjs/common';
import { ZonasComunesService } from './zonas-comunes.service';
import { ZonasComunesController } from './zonas-comunes.controller';

@Module({
  providers: [ZonasComunesService],
  controllers: [ZonasComunesController],
})
export class ZonasComunesModule {}
