import { Module } from '@nestjs/common';
import { CobranzaService } from './cobranza.service';
import { CobranzaController } from './cobranza.controller';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [NotificacionesModule],
  providers: [CobranzaService],
  controllers: [CobranzaController],
})
export class CobranzaModule {}
