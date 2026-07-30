import { Module } from '@nestjs/common';
import { ParqueaderosService } from './parqueaderos.service';
import { ParqueaderosController } from './parqueaderos.controller';

@Module({
  providers: [ParqueaderosService],
  controllers: [ParqueaderosController],
})
export class ParqueaderosModule {}
