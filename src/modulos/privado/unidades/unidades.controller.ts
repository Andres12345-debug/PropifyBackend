import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from 'src/middleware/seguridad/guardianes/jwt.guard';
import { RolesGuard } from 'src/middleware/seguridad/guardianes/roles.guard';
import { Roles } from 'src/middleware/seguridad/decoradores/roles.decorator';
import { RoleNames } from 'src/middleware/seguridad/rol.helper';
import { UnidadesService } from './unidades.service';
import { CrearUnidadDto } from './dto/crear-unidad.dto';
import { ActualizarUnidadDto } from './dto/actualizar-unidad.dto';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('unidades')
@UseGuards(JwtGuard, RolesGuard)
export class UnidadesController {
  constructor(private readonly unidadesService: UnidadesService) {}

  @Get()
  public consultar(
    @Query('inmuebleId', ParseIntPipe) inmuebleId: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.unidadesService.consultar(inmuebleId, request.datosUsuario!);
  }

  @Get(':id')
  public consultarUno(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.unidadesService.consultarUno(id, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Post()
  public registrar(
    @Body() datos: CrearUnidadDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.unidadesService.registrar(datos, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Put(':id')
  public actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: ActualizarUnidadDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.unidadesService.actualizar(id, datos, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Delete(':id')
  public eliminar(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.unidadesService.eliminar(id, request.datosUsuario!);
  }
}
