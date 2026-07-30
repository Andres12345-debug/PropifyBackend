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
import { ReservasService } from './reservas.service';
import { CrearReservaDto } from './dto/crear-reserva.dto';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('reservas')
@UseGuards(JwtGuard, RolesGuard)
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @Roles(RoleNames.RESIDENTE)
  @Get('me')
  public consultarMias(@Req() request: RequestConUsuario) {
    return this.reservasService.consultarMias(request.datosUsuario!);
  }

  @Get()
  public consultarPorZona(
    @Query('zonaId', ParseIntPipe) zonaId: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.reservasService.consultarPorZona(zonaId, request.datosUsuario!);
  }

  @Roles(RoleNames.RESIDENTE)
  @Post()
  public registrar(
    @Body() datos: CrearReservaDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.reservasService.registrar(datos, request.datosUsuario!);
  }

  @Roles(RoleNames.RESIDENTE)
  @Patch(':id/cancelar')
  public cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.reservasService.cancelar(id, request.datosUsuario!);
  }
}
