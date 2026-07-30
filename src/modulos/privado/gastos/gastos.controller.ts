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
import { GastosService } from './gastos.service';
import { CrearGastoDto } from './dto/crear-gasto.dto';
import { ActualizarGastoDto } from './dto/actualizar-gasto.dto';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('gastos')
@UseGuards(JwtGuard, RolesGuard)
@Roles(RoleNames.DUENO, RoleNames.ADMIN)
export class GastosController {
  constructor(private readonly gastosService: GastosService) {}

  @Get()
  public consultar(
    @Query('inmuebleId', ParseIntPipe) inmuebleId: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.gastosService.consultar(inmuebleId, request.datosUsuario!);
  }

  @Post()
  public registrar(
    @Body() datos: CrearGastoDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.gastosService.registrar(datos, request.datosUsuario!);
  }

  @Put(':id')
  public actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: ActualizarGastoDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.gastosService.actualizar(id, datos, request.datosUsuario!);
  }

  @Delete(':id')
  public eliminar(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.gastosService.eliminar(id, request.datosUsuario!);
  }
}
