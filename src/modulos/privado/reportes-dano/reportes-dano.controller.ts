import {
  Body,
  Controller,
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
import { ReportesDanoService } from './reportes-dano.service';
import { CrearReporteDanoDto } from './dto/crear-reporte-dano.dto';
import { ActualizarReporteDanoDto } from './dto/actualizar-reporte-dano.dto';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('reportes-dano')
@UseGuards(JwtGuard, RolesGuard)
export class ReportesDanoController {
  constructor(private readonly reportesDanoService: ReportesDanoService) {}

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Get()
  public consultar(
    @Query('unidadId', ParseIntPipe) unidadId: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.reportesDanoService.consultar(unidadId, request.datosUsuario!);
  }

  @Roles(RoleNames.RESIDENTE, RoleNames.DUENO, RoleNames.ADMIN)
  @Post()
  public registrar(
    @Body() datos: CrearReporteDanoDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.reportesDanoService.registrar(datos, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Put(':id')
  public actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: ActualizarReporteDanoDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.reportesDanoService.actualizar(
      id,
      datos,
      request.datosUsuario!,
    );
  }
}
