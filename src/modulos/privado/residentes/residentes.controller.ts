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
import { ResidentesService } from './residentes.service';
import { CrearResidenteDto } from './dto/crear-residente.dto';
import { ActualizarResidenteDto } from './dto/actualizar-residente.dto';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('residentes')
@UseGuards(JwtGuard, RolesGuard)
export class ResidentesController {
  constructor(private readonly residentesService: ResidentesService) {}

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Get()
  public consultar(
    @Query('unidadId', ParseIntPipe) unidadId: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.residentesService.consultar(unidadId, request.datosUsuario!);
  }

  @Roles(RoleNames.RESIDENTE)
  @Get('me')
  public consultarMe(@Req() request: RequestConUsuario) {
    return this.residentesService.consultarMe(request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Get(':id')
  public consultarUno(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.residentesService.consultarUno(id, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Post()
  public registrar(
    @Body() datos: CrearResidenteDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.residentesService.registrar(datos, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Put(':id')
  public actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: ActualizarResidenteDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.residentesService.actualizar(id, datos, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Delete(':id')
  public eliminar(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.residentesService.eliminar(id, request.datosUsuario!);
  }
}
