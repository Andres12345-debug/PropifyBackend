import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from 'src/middleware/seguridad/guardianes/jwt.guard';
import { RolesGuard } from 'src/middleware/seguridad/guardianes/roles.guard';
import { Roles } from 'src/middleware/seguridad/decoradores/roles.decorator';
import { RoleNames } from 'src/middleware/seguridad/rol.helper';
import { InmueblesService } from './inmuebles.service';
import { CrearInmuebleDto } from './dto/crear-inmueble.dto';
import { ActualizarInmuebleDto } from './dto/actualizar-inmueble.dto';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('inmuebles')
@UseGuards(JwtGuard, RolesGuard)
export class InmueblesController {
  constructor(private readonly inmueblesService: InmueblesService) {}

  @Get()
  public consultar(@Req() request: RequestConUsuario) {
    return this.inmueblesService.consultar(request.datosUsuario!);
  }

  @Get(':id')
  public consultarUno(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.inmueblesService.consultarUno(id, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Post()
  public registrar(
    @Body() datos: CrearInmuebleDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.inmueblesService.registrar(datos, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Put(':id')
  public actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: ActualizarInmuebleDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.inmueblesService.actualizar(id, datos, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Delete(':id')
  public eliminar(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.inmueblesService.eliminar(id, request.datosUsuario!);
  }
}
