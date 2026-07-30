import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from 'src/middleware/seguridad/guardianes/jwt.guard';
import { RolesGuard } from 'src/middleware/seguridad/guardianes/roles.guard';
import { Roles } from 'src/middleware/seguridad/decoradores/roles.decorator';
import { RoleNames } from 'src/middleware/seguridad/rol.helper';
import { CajaFuerteService } from './caja-fuerte.service';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('caja-fuerte')
@UseGuards(JwtGuard, RolesGuard)
@Roles(RoleNames.DUENO, RoleNames.ADMIN)
export class CajaFuerteController {
  constructor(private readonly cajaFuerteService: CajaFuerteService) {}

  @Get()
  public consultar(
    @Query('inmuebleId', ParseIntPipe) inmuebleId: number,
    @Query('periodo') periodo: string | undefined,
    @Req() request: RequestConUsuario,
  ) {
    return this.cajaFuerteService.consultar(
      inmuebleId,
      periodo,
      request.datosUsuario!,
    );
  }
}
