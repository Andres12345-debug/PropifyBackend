import { NotFoundException } from '@nestjs/common';
import { obtenerTenantId } from './rol.helper';
import type { SesionUsuario } from './guardianes/auth.interface';

// Cualquier entidad que cuelgue (directa o indirectamente) de un Inmueble
// debe pasar por aquí antes de devolverse o modificarse. NotFoundException
// (no Forbidden) para no filtrarle a un tenant que el recurso existe en
// otro tenant.
export function verificarTenant(
  codTenantEntidad: number | undefined,
  datosUsuario: SesionUsuario,
  mensaje = 'Recurso no encontrado',
): void {
  if (!codTenantEntidad || codTenantEntidad !== obtenerTenantId(datosUsuario)) {
    throw new NotFoundException(mensaje);
  }
}
