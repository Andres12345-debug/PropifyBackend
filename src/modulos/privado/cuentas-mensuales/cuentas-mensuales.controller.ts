import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from 'src/middleware/seguridad/guardianes/jwt.guard';
import { RolesGuard } from 'src/middleware/seguridad/guardianes/roles.guard';
import { Roles } from 'src/middleware/seguridad/decoradores/roles.decorator';
import { RoleNames } from 'src/middleware/seguridad/rol.helper';
import { CuentasMensualesService } from './cuentas-mensuales.service';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('cuentas')
@UseGuards(JwtGuard, RolesGuard)
export class CuentasMensualesController {
  constructor(
    private readonly cuentasMensualesService: CuentasMensualesService,
  ) {}

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Get()
  public consultarTodas(@Req() request: RequestConUsuario) {
    return this.cuentasMensualesService.consultarTodas(request.datosUsuario!);
  }

  @Roles(RoleNames.RESIDENTE)
  @Get('me')
  public consultarMias(@Req() request: RequestConUsuario) {
    return this.cuentasMensualesService.consultarMias(request.datosUsuario!);
  }

  @Get(':id')
  public consultarUna(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.cuentasMensualesService.consultarUna(id, request.datosUsuario!);
  }
}
