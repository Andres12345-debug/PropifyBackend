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
import { ParqueaderosService } from './parqueaderos.service';
import { CrearParqueaderoDto } from './dto/crear-parqueadero.dto';
import { ActualizarParqueaderoDto } from './dto/actualizar-parqueadero.dto';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('parqueaderos')
@UseGuards(JwtGuard, RolesGuard)
@Roles(RoleNames.DUENO, RoleNames.ADMIN)
export class ParqueaderosController {
  constructor(private readonly parqueaderosService: ParqueaderosService) {}

  @Get()
  public consultar(
    @Query('inmuebleId', ParseIntPipe) inmuebleId: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.parqueaderosService.consultar(
      inmuebleId,
      request.datosUsuario!,
    );
  }

  @Post()
  public registrar(
    @Body() datos: CrearParqueaderoDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.parqueaderosService.registrar(datos, request.datosUsuario!);
  }

  @Put(':id')
  public actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: ActualizarParqueaderoDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.parqueaderosService.actualizar(
      id,
      datos,
      request.datosUsuario!,
    );
  }

  @Delete(':id')
  public eliminar(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.parqueaderosService.eliminar(id, request.datosUsuario!);
  }
}
