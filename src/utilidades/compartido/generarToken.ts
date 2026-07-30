import { sign, SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export interface DatosSesion {
  cod_usuario: number;
  nombre_usuario: string;
  nombre_rol: string;
}

class GenerarToken {
  public static procesarRespuesta(datosSesion: DatosSesion): string {
    if (
      !datosSesion ||
      !datosSesion.cod_usuario ||
      !datosSesion.nombre_usuario
    ) {
      throw new Error('Faltan datos esenciales para generar el token.');
    }

    if (!process.env.CLAVE_SECRETA) {
      throw new Error(
        'La variable de entorno CLAVE_SECRETA no está configurada.',
      );
    }

    const token = sign(
      {
        jti: uuidv4(),
        sub: datosSesion.cod_usuario,
        name: datosSesion.nombre_usuario,
        nombre_rol: datosSesion.nombre_rol,
      },
      process.env.CLAVE_SECRETA,
      {
        algorithm: 'HS256',
        expiresIn: (process.env.JWT_TTL ?? '1h') as SignOptions['expiresIn'],
      },
    );

    return token;
  }
}

export default GenerarToken;
