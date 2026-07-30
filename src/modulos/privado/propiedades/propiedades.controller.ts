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
import { PropiedadesService } from './propiedades.service';
import { CrearPropiedadDto } from './dto/crear-propiedad.dto';
import { ActualizarPropiedadDto } from './dto/actualizar-propiedad.dto';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('propiedades')
@UseGuards(JwtGuard)
export class PropiedadesController {
  constructor(private readonly propiedadesService: PropiedadesService) {}

  @Get()
  public consultar() {
    return this.propiedadesService.consultar();
  }

  @Get(':id')
  public consultarUno(@Param('id', ParseIntPipe) id: number) {
    return this.propiedadesService.consultarUno(id);
  }

  @Post()
  public registrar(
    @Body() datos: CrearPropiedadDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.propiedadesService.registrar(datos, request.datosUsuario!);
  }

  @Put(':id')
  public actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: ActualizarPropiedadDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.propiedadesService.actualizar(id, datos, request.datosUsuario!);
  }

  @Delete(':id')
  public eliminar(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.propiedadesService.eliminar(id, request.datosUsuario!);
  }
}
