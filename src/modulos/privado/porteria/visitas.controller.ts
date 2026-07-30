import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { CrearVisitaDto } from './dto/crear-visita.dto';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('visitas')
@UseGuards(JwtGuard, RolesGuard)
export class VisitasController {
  constructor(private readonly porteriaService: PorteriaService) {}

  @Roles(RoleNames.DUENO, RoleNames.ADMIN, RoleNames.CELADOR)
  @Get()
  public consultar(
    @Query('unidadId', ParseIntPipe) unidadId: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.porteriaService.consultarVisitasPorUnidad(
      unidadId,
      request.datosUsuario!,
    );
  }

  @Roles(RoleNames.CELADOR)
  @Post('entrada')
  public registrarEntrada(
    @Body() datos: CrearVisitaDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.porteriaService.registrarEntradaVisita(
      datos,
      request.datosUsuario!,
    );
  }

  @Roles(RoleNames.CELADOR)
  @Patch(':id/salida')
  public registrarSalida(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.porteriaService.registrarSalidaVisita(
      id,
      request.datosUsuario!,
    );
  }
}
