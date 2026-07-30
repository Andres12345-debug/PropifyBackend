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
import { RolesService } from './roles.service';
import { CrearRolDto } from './dto/crearRol.dto';
import { JwtGuard } from 'src/middleware/seguridad/guardianes/jwt.guard';
import { RolesGuard } from 'src/middleware/seguridad/guardianes/roles.guard';
import { Roles } from 'src/middleware/seguridad/decoradores/roles.decorator';
import { RoleNames } from 'src/middleware/seguridad/rol.helper';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('roles')
@UseGuards(JwtGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Get()
  public consultar(@Req() req: RequestConUsuario) {
    return this.rolesService.consultar(req.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Get(':id')
  public consultarUno(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestConUsuario,
  ) {
    return this.rolesService.consultarUno(id, req.datosUsuario!);
  }

  // La tabla roles es GLOBAL (no tiene codTenant): un DUENO de un tenant no
  // puede tocarla, porque renombrar/borrar un rol afectaría a TODOS los
  // tenants de la plataforma, no solo al suyo (ver hallazgo de auditoría).
  // Escribir aquí es exclusivo del superadministrador.
  @Roles(RoleNames.SUPERADMIN)
  @Post()
  public registrar(@Body() datos: CrearRolDto) {
    return this.rolesService.registrar(datos);
  }

  @Roles(RoleNames.SUPERADMIN)
  @Put(':id')
  public actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: CrearRolDto,
  ) {
    return this.rolesService.actualizar(datos, id);
  }

  @Roles(RoleNames.SUPERADMIN)
  @Delete(':id')
  public eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.eliminar(id);
  }
}
