import { NotFoundException } from '@nestjs/common';
import { verificarTenant } from './tenant.helper';
import type { SesionUsuario } from './guardianes/auth.interface';

function sesionCon(tenantId: number): SesionUsuario {
  return {
    jti: 'x',
    sub: 1,
    name: 'Test',
    nombre_rol: 'admin',
    tenant_id: tenantId,
  };
}

describe('verificarTenant', () => {
  it('no lanza cuando el tenant de la entidad coincide con el de la sesión', () => {
    expect(() => verificarTenant(5, sesionCon(5))).not.toThrow();
  });

  it('lanza NotFoundException cuando el tenant no coincide', () => {
    expect(() => verificarTenant(5, sesionCon(9))).toThrow(NotFoundException);
  });

  it('lanza NotFoundException cuando la entidad no tiene tenant', () => {
    expect(() => verificarTenant(undefined, sesionCon(5))).toThrow(
      NotFoundException,
    );
  });

  it('el superadministrador nunca es bloqueado, sin importar el tenant', () => {
    const superAdmin: SesionUsuario = {
      jti: 'x',
      sub: 1,
      name: 'Super',
      nombre_rol: 'superadministrador',
      tenant_id: null,
    };
    expect(() => verificarTenant(9, superAdmin)).not.toThrow();
    expect(() => verificarTenant(undefined, superAdmin)).not.toThrow();
  });
});
