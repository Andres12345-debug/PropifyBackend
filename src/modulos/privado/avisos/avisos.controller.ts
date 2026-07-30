import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from 'src/middleware/seguridad/guardianes/jwt.guard';
import { RolesGuard } from 'src/middleware/seguridad/guardianes/roles.guard';
import { Roles } from 'src/middleware/seguridad/decoradores/roles.decorator';
import { RoleNames } from 'src/middleware/seguridad/rol.helper';
import { AvisosService } from './avisos.service';
import { CrearAvisoDto } from './dto/crear-aviso.dto';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('avisos')
@UseGuards(JwtGuard, RolesGuard)
export class AvisosController {
  constructor(private readonly avisosService: AvisosService) {}

  @Get()
  public consultar(
    @Query('inmuebleId', ParseIntPipe) inmuebleId: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.avisosService.consultar(inmuebleId, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Post()
  public registrar(
    @Body() datos: CrearAvisoDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.avisosService.registrar(datos, request.datosUsuario!);
  }
}
