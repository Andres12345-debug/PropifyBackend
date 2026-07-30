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
import { CrearPaqueteDto } from './dto/crear-paquete.dto';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('paquetes')
@UseGuards(JwtGuard, RolesGuard)
export class PaquetesController {
  constructor(private readonly porteriaService: PorteriaService) {}

  @Roles(RoleNames.DUENO, RoleNames.ADMIN, RoleNames.CELADOR)
  @Get()
  public consultar(
    @Query('unidadId', ParseIntPipe) unidadId: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.porteriaService.consultarPaquetesPorUnidad(
      unidadId,
      request.datosUsuario!,
    );
  }

  @Roles(RoleNames.CELADOR)
  @Post()
  public registrarLlegada(
    @Body() datos: CrearPaqueteDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.porteriaService.registrarLlegadaPaquete(
      datos,
      request.datosUsuario!,
    );
  }

  @Roles(RoleNames.CELADOR)
  @Patch(':id/entregado')
  public registrarEntrega(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.porteriaService.registrarEntregaPaquete(
      id,
      request.datosUsuario!,
    );
  }
}
