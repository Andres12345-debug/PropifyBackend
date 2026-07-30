import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import type { SesionUsuario } from './auth.interface';

function sesionCon(rol: string, tenantId: number | null = 1): SesionUsuario {
  return {
    jti: 'x',
    sub: 1,
    name: 'Test',
    nombre_rol: rol,
    tenant_id: tenantId,
  };
}

describe('RolesGuard', () => {
  function crearGuard(rolesPermitidos: string[] | undefined) {
    const reflector = {
      getAllAndOverride: () => rolesPermitidos,
    } as unknown as Reflector;
    return new RolesGuard(reflector);
  }

  function contexto(usuario?: SesionUsuario): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ datosUsuario: usuario }),
      }),
    } as unknown as ExecutionContext;
  }

  it('permite el acceso si el endpoint no declara @Roles', () => {
    const guard = crearGuard(undefined);
    expect(guard.canActivate(contexto(sesionCon('residente')))).toBe(true);
  });

  it('permite el acceso si el rol del usuario está en la lista', () => {
    const guard = crearGuard(['dueno', 'admin']);
    expect(guard.canActivate(contexto(sesionCon('admin')))).toBe(true);
  });

  it('rechaza el acceso si el rol no está en la lista', () => {
    const guard = crearGuard(['dueno', 'admin']);
    expect(() => guard.canActivate(contexto(sesionCon('residente')))).toThrow(
      ForbiddenException,
    );
  });

  it('el superadministrador pasa cualquier @Roles(), aunque no esté listado', () => {
    const guard = crearGuard(['dueno']);
    expect(
      guard.canActivate(contexto(sesionCon('superadministrador', null))),
    ).toBe(true);
  });
});
