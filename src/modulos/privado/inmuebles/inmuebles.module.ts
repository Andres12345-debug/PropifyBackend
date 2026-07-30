import { Module } from '@nestjs/common';
import { InmueblesService } from './inmuebles.service';
import { InmueblesController } from './inmuebles.controller';

@Module({
  providers: [InmueblesService],
  controllers: [InmueblesController],
})
export class InmueblesModule {}
