import { Module } from '@nestjs/common';
import { ResidentesService } from './residentes.service';
import { ResidentesController } from './residentes.controller';

@Module({
  providers: [ResidentesService],
  controllers: [ResidentesController],
})
export class ResidentesModule {}
