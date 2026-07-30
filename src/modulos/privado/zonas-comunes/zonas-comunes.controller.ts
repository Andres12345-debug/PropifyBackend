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
import { ZonasComunesService } from './zonas-comunes.service';
import { CrearZonaComunDto } from './dto/crear-zona-comun.dto';
import { ActualizarZonaComunDto } from './dto/actualizar-zona-comun.dto';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('zonas-comunes')
@UseGuards(JwtGuard, RolesGuard)
export class ZonasComunesController {
  constructor(private readonly zonasComunesService: ZonasComunesService) {}

  @Get()
  public consultar(
    @Query('inmuebleId', ParseIntPipe) inmuebleId: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.zonasComunesService.consultar(
      inmuebleId,
      request.datosUsuario!,
    );
  }

  @Get(':id')
  public consultarUna(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.zonasComunesService.consultarUna(id, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Post()
  public registrar(
    @Body() datos: CrearZonaComunDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.zonasComunesService.registrar(datos, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Put(':id')
  public actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: ActualizarZonaComunDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.zonasComunesService.actualizar(
      id,
      datos,
      request.datosUsuario!,
    );
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Delete(':id')
  public eliminar(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.zonasComunesService.eliminar(id, request.datosUsuario!);
  }
}
