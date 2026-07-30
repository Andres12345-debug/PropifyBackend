import { SesionUsuario } from './guardianes/auth.interface';

// Roles base sembrados por SeedService. Agrega aquí cualquier rol nuevo que
// el dominio necesite — nunca lo escribas como string suelto en un @Roles().
export const RoleNames = {
  DUENO: 'dueno',
  ADMIN: 'admin',
  RESIDENTE: 'residente',
  CELADOR: 'celador',
} as const;

export type RolNombre = (typeof RoleNames)[keyof typeof RoleNames];

export function normalizarRol(rol?: string | null): string {
  return (rol ?? '').toString().trim().toLowerCase();
}

export function obtenerRolUsuario(
  usuarioActual: SesionUsuario | null | undefined,
): string {
  return normalizarRol(usuarioActual?.nombre_rol ?? '');
}

export function esAdmin(rol: string | null | undefined): boolean {
  return normalizarRol(rol) === RoleNames.ADMIN;
}

export function esDueno(rol: string | null | undefined): boolean {
  return normalizarRol(rol) === RoleNames.DUENO;
}

// Dueño o admin: ambos gestionan el día a día (inmuebles, residentes,
// gastos, caja fuerte). Solo el dueño puede tocar plan/facturación/marca
// blanca — eso se valida aparte con esDueno().
export function esAdminOperativo(rol: string | null | undefined): boolean {
  return esAdmin(rol) || esDueno(rol);
}

export function tieneRol(
  usuarioActual: SesionUsuario | null | undefined,
  ...roles: string[]
): boolean {
  const rol = obtenerRolUsuario(usuarioActual);
  return roles.map(normalizarRol).includes(rol);
}

export function obtenerUsuarioId(
  usuarioActual: SesionUsuario | null | undefined,
): number | null {
  const id = usuarioActual?.sub;
  return id ? Number(id) : null;
}

export function obtenerTenantId(
  usuarioActual: SesionUsuario | null | undefined,
): number | null {
  const id = usuarioActual?.tenant_id;
  return id ? Number(id) : null;
}
