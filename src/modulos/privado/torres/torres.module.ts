import { Module } from '@nestjs/common';
import { TorresService } from './torres.service';
import { TorresController } from './torres.controller';

@Module({
  providers: [TorresService],
  controllers: [TorresController],
})
export class TorresModule {}
