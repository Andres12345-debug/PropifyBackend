import { Module } from '@nestjs/common';
import { CajaFuerteService } from './caja-fuerte.service';
import { CajaFuerteController } from './caja-fuerte.controller';

@Module({
  providers: [CajaFuerteService],
  controllers: [CajaFuerteController],
})
export class CajaFuerteModule {}
