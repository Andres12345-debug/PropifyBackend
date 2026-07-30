import { Module } from '@nestjs/common';
import { AccesosService } from './accesos.service';
import { AccesosController } from './accesos.controller';

@Module({
  providers: [AccesosService],
  controllers: [AccesosController],
})
export class AccesosModule {}
