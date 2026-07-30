import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { DataSource, Repository } from 'typeorm';
import { RequestConUsuario, SesionUsuario } from './auth.interface';
import { TokenRevocationService } from '../token-revocation.service';
import { Usuario } from 'src/modelos/usuario/usuario';

@Injectable()
export class JwtGuard implements CanActivate {
  private readonly usuarioRepository: Repository<Usuario>;

  constructor(
    private readonly tokenRevocationService: TokenRevocationService,
    private readonly dataSource: DataSource,
  ) {
    this.usuarioRepository = this.dataSource.getRepository(Usuario);
  }

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

    // Si la contraseña cambió después de emitido este token (iat), se
    // invalida — así cambiar la contraseña cierra cualquier sesión previa
    // sin depender de que cada jti esté en la lista de revocados.
    if (respuesta.sub && respuesta.iat) {
      const usuario = await this.usuarioRepository.findOne({
        where: { codUsuario: respuesta.sub },
        select: ['codUsuario', 'passwordChangedAt'],
      });

      if (
        usuario?.passwordChangedAt &&
        respuesta.iat * 1000 < usuario.passwordChangedAt.getTime()
      ) {
        throw new HttpException('Token inválido', HttpStatus.UNAUTHORIZED);
      }
    }

    request.datosUsuario = respuesta;

    return true;
  }
}
