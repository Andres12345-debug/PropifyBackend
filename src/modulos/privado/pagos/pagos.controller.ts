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
import { PagosService } from './pagos.service';
import { CrearPagoDto } from './dto/crear-pago.dto';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('pagos')
@UseGuards(JwtGuard, RolesGuard)
@Roles(RoleNames.DUENO, RoleNames.ADMIN)
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Get()
  public consultar(
    @Query('cuentaId', ParseIntPipe) cuentaId: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.pagosService.consultar(cuentaId, request.datosUsuario!);
  }

  @Post()
  public registrar(
    @Body() datos: CrearPagoDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.pagosService.registrar(datos, request.datosUsuario!);
  }
}
