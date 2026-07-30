import { Request } from 'express';

export interface SesionUsuario {
  jti: string;
  sub: number;
  name: string;
  nombre_rol: string;
  // null para el superadministrador: no pertenece a ningún tenant.
  tenant_id: number | null;
  iat?: number;
  exp?: number;
}

export interface RequestConUsuario extends Request {
  datosUsuario?: SesionUsuario;
}
