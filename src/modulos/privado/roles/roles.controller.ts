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

  @Roles(RoleNames.ADMIN)
  @Get()
  public consultar() {
    return this.rolesService.consultar();
  }

  @Roles(RoleNames.ADMIN)
  @Get(':id')
  public consultarUno(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.consultarUno(id);
  }

  @Roles(RoleNames.ADMIN)
  @Post()
  public registrar(@Body() datos: CrearRolDto) {
    return this.rolesService.registrar(datos);
  }

  @Roles(RoleNames.ADMIN)
  @Put(':id')
  public actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: CrearRolDto,
  ) {
    return this.rolesService.actualizar(datos, id);
  }

  @Roles(RoleNames.ADMIN)
  @Delete(':id')
  public eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.eliminar(id);
  }
}
