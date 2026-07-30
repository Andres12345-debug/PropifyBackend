import { Request } from 'express';

export interface SesionUsuario {
  jti: string;
  sub: number;
  name: string;
  nombre_rol: string;
  iat?: number;
  exp?: number;
}

export interface RequestConUsuario extends Request {
  datosUsuario?: SesionUsuario;
}
