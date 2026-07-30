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
import { TorresService } from './torres.service';
import { CrearTorreDto } from './dto/crear-torre.dto';
import { ActualizarTorreDto } from './dto/actualizar-torre.dto';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('torres')
@UseGuards(JwtGuard, RolesGuard)
export class TorresController {
  constructor(private readonly torresService: TorresService) {}

  @Get()
  public consultar(
    @Query('inmuebleId', ParseIntPipe) inmuebleId: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.torresService.consultar(inmuebleId, request.datosUsuario!);
  }

  @Get(':id')
  public consultarUno(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.torresService.consultarUno(id, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Post()
  public registrar(
    @Body() datos: CrearTorreDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.torresService.registrar(datos, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Put(':id')
  public actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: ActualizarTorreDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.torresService.actualizar(id, datos, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Delete(':id')
  public eliminar(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.torresService.eliminar(id, request.datosUsuario!);
  }
}
