import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CrearRolDto } from './dto/crearRol.dto';
import { JwtGuard } from 'src/middleware/seguridad/guardianes/jwt.guard';
import { RolesGuard } from 'src/middleware/seguridad/guardianes/roles.guard';
import { Roles } from 'src/middleware/seguridad/decoradores/roles.decorator';
import { RoleNames } from 'src/middleware/seguridad/rol.helper';

@Controller('roles')
@UseGuards(JwtGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Get()
  public consultar() {
    return this.rolesService.consultar();
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Get(':id')
  public consultarUno(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.consultarUno(id);
  }

  // Catálogo de roles fijo por el spec (DUEÑO/ADMIN/RESIDENTE/CELADOR) —
  // solo el dueño puede tocarlo, es configuración sensible del tenant.
  @Roles(RoleNames.DUENO)
  @Post()
  public registrar(@Body() datos: CrearRolDto) {
    return this.rolesService.registrar(datos);
  }

  @Roles(RoleNames.DUENO)
  @Put(':id')
  public actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: CrearRolDto,
  ) {
    return this.rolesService.actualizar(datos, id);
  }

  @Roles(RoleNames.DUENO)
  @Delete(':id')
  public eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.eliminar(id);
  }
}
