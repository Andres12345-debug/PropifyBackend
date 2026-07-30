import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decoradores/roles.decorator';
import { RequestConUsuario } from './auth.interface';
import { obtenerRolUsuario } from '../rol.helper';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesPermitidos = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!rolesPermitidos) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const usuario = request.datosUsuario;

    if (!usuario) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const rolUsuario = obtenerRolUsuario(usuario);

    if (
      !rolUsuario ||
      !rolesPermitidos.map((r) => r.toLowerCase()).includes(rolUsuario)
    ) {
      throw new ForbiddenException(
        `Acceso denegado. Rol requerido: ${rolesPermitidos.join(' | ')}`,
      );
    }

    return true;
  }
}
