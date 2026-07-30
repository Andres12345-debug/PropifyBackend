import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/middleware/seguridad/guardianes/jwt.guard';
import { RolesGuard } from 'src/middleware/seguridad/guardianes/roles.guard';
import { Roles } from 'src/middleware/seguridad/decoradores/roles.decorator';
import { RoleNames } from 'src/middleware/seguridad/rol.helper';
import { CobranzaService } from './cobranza.service';

@Controller('cobranza')
@UseGuards(JwtGuard, RolesGuard)
export class CobranzaController {
  constructor(private readonly cobranzaService: CobranzaService) {}

  // Ejecuta el mismo ciclo que corre el cron diario — imprescindible para
  // probar el motor de cobranza sin esperar a las 6am ni cambiar la hora
  // del servidor.
  @Roles(RoleNames.DUENO)
  @Post('ejecutar')
  public async ejecutar(): Promise<{ mensaje: string }> {
    await this.cobranzaService.ejecutarCobranzaDiaria();
    return { mensaje: 'Ciclo de cobranza ejecutado correctamente' };
  }
}
