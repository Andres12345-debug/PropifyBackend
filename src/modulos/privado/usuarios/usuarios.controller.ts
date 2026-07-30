import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from 'src/middleware/seguridad/guardianes/jwt.guard';
import { RolesGuard } from 'src/middleware/seguridad/guardianes/roles.guard';
import { UsuariosService } from './usuarios.service';
import { Roles } from 'src/middleware/seguridad/decoradores/roles.decorator';
import { RoleNames } from 'src/middleware/seguridad/rol.helper';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('usuarios')
@UseGuards(JwtGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuarioService: UsuariosService) {}

  @Roles(RoleNames.ADMIN)
  @Get()
  public obtenerUsuarios() {
    return this.usuarioService.consultar();
  }

  @Get('perfil')
  public obtenerPerfil(@Req() req: RequestConUsuario) {
    return { usuario: req.datosUsuario };
  }

  @Roles(RoleNames.ADMIN)
  @Post()
  public registrar(@Body() datos: CrearUsuarioDto) {
    return this.usuarioService.registrar(datos);
  }

  @Roles(RoleNames.ADMIN)
  @Delete(':id')
  public eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.usuarioService.eliminar(id);
  }
}
