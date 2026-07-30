import { Module } from '@nestjs/common';
import { ReportesDanoService } from './reportes-dano.service';
import { ReportesDanoController } from './reportes-dano.controller';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [NotificacionesModule],
  providers: [ReportesDanoService],
  controllers: [ReportesDanoController],
})
export class ReportesDanoModule {}
