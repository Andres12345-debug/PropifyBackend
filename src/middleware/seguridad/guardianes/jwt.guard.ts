import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { RequestConUsuario, SesionUsuario } from './auth.interface';
import { TokenRevocationService } from '../token-revocation.service';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly tokenRevocationService: TokenRevocationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestConUsuario>();

    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new HttpException('Token no enviado', HttpStatus.UNAUTHORIZED);
    }

    let respuesta: SesionUsuario;
    try {
      const token = authorization.split(' ')[1];

      respuesta = jwt.verify(token, process.env.CLAVE_SECRETA as string, {
        algorithms: ['HS256'],
      }) as unknown as SesionUsuario;
    } catch {
      throw new HttpException('Token inválido', HttpStatus.UNAUTHORIZED);
    }

    if (
      respuesta.jti &&
      (await this.tokenRevocationService.estaRevocado(respuesta.jti))
    ) {
      throw new HttpException('Token inválido', HttpStatus.UNAUTHORIZED);
    }

    request.datosUsuario = respuesta;

    return true;
  }
}
