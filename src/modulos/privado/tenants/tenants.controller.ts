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
import { TenantsService } from './tenants.service';
import { CrearTenantDto } from './dto/crear-tenant.dto';
import { ActualizarTenantDto } from './dto/actualizar-tenant.dto';
import { JwtGuard } from 'src/middleware/seguridad/guardianes/jwt.guard';
import { RolesGuard } from 'src/middleware/seguridad/guardianes/roles.guard';
import { Roles } from 'src/middleware/seguridad/decoradores/roles.decorator';
import { RoleNames } from 'src/middleware/seguridad/rol.helper';

// Gestión de tenants de la plataforma: exclusiva del superadministrador.
// A diferencia del resto de módulos de dominio, aquí NO se listan también
// DUENO/ADMIN — un dueño de tenant no debe poder ver ni tocar otros tenants.
@Controller('tenants')
@UseGuards(JwtGuard, RolesGuard)
@Roles(RoleNames.SUPERADMIN)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  public consultar() {
    return this.tenantsService.consultar();
  }

  @Get(':id')
  public consultarUno(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.consultarUno(id);
  }

  @Post()
  public registrar(@Body() datos: CrearTenantDto) {
    return this.tenantsService.registrar(datos);
  }

  @Put(':id')
  public actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: ActualizarTenantDto,
  ) {
    return this.tenantsService.actualizar(id, datos);
  }

  @Delete(':id')
  public eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.eliminar(id);
  }
}
