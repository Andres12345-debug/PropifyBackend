import { Module } from '@nestjs/common';
import { RegistrosService } from './registros.service';
import { RegistrosController } from './registros.controller';
import { CorreoModule } from '../correo/correo.module';

@Module({
  providers: [RegistrosService],
  controllers: [RegistrosController],
  imports: [CorreoModule],
})
export class RegistrosModule {}
