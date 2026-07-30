import { NotFoundException } from '@nestjs/common';
import { esSuperAdmin, obtenerRolUsuario, obtenerTenantId } from './rol.helper';
import type { SesionUsuario } from './guardianes/auth.interface';

// Cualquier entidad que cuelgue (directa o indirectamente) de un Inmueble
// debe pasar por aquí antes de devolverse o modificarse. NotFoundException
// (no Forbidden) para no filtrarle a un tenant que el recurso existe en
// otro tenant.
// El superadmin tiene control total de la plataforma: nunca pertenece a un
// tenant, así que se salta este chequeo y puede operar sobre cualquiera.
export function verificarTenant(
  codTenantEntidad: number | null | undefined,
  datosUsuario: SesionUsuario,
  mensaje = 'Recurso no encontrado',
): void {
  if (esSuperAdmin(obtenerRolUsuario(datosUsuario))) {
    return;
  }

  if (!codTenantEntidad || codTenantEntidad !== obtenerTenantId(datosUsuario)) {
    throw new NotFoundException(mensaje);
  }
}
