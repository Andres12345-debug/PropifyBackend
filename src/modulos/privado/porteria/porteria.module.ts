import { Module } from '@nestjs/common';
import { PorteriaService } from './porteria.service';
import { VisitasController } from './visitas.controller';
import { AutorizacionesPreviasController } from './autorizaciones-previas.controller';
import { PaquetesController } from './paquetes.controller';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [NotificacionesModule],
  providers: [PorteriaService],
  controllers: [
    VisitasController,
    AutorizacionesPreviasController,
    PaquetesController,
  ],
})
export class PorteriaModule {}
