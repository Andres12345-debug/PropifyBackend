import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from 'src/middleware/seguridad/guardianes/jwt.guard';
import { RolesGuard } from 'src/middleware/seguridad/guardianes/roles.guard';
import { Roles } from 'src/middleware/seguridad/decoradores/roles.decorator';
import { RoleNames } from 'src/middleware/seguridad/rol.helper';
import { PorteriaService } from './porteria.service';
import { CrearAutorizacionPreviaDto } from './dto/crear-autorizacion-previa.dto';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('autorizaciones-previas')
@UseGuards(JwtGuard, RolesGuard)
export class AutorizacionesPreviasController {
  constructor(private readonly porteriaService: PorteriaService) {}

  @Roles(RoleNames.CELADOR)
  @Get()
  public consultarVigentes(
    @Query('unidadId', ParseIntPipe) unidadId: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.porteriaService.consultarAutorizacionesVigentes(
      unidadId,
      request.datosUsuario!,
    );
  }

  @Roles(RoleNames.RESIDENTE)
  @Post()
  public registrar(
    @Body() datos: CrearAutorizacionPreviaDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.porteriaService.registrarAutorizacion(
      datos,
      request.datosUsuario!,
    );
  }
}
