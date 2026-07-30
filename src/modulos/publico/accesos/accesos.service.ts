import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';

import { Usuario } from 'src/modelos/usuario/usuario';
import { Acceso } from 'src/modelos/acceso/acceso';
import { AccessLog, AuditEvent } from 'src/modelos/audit/access-log';

import GenerarToken, {
  type DatosSesion,
} from 'src/utilidades/compartido/generarToken';
import { ACCESO_SQL } from './accesos.sql';
import { LoginDto } from './dto/accesoDto';
import { TokenRevocationService } from 'src/middleware/seguridad/token-revocation.service';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class AccesosService {
  private usuarioRepository: Repository<Usuario>;
  private accesoRepository: Repository<Acceso>;
  private accessLogRepository: Repository<AccessLog>;

  private static readonly RATE_LIMIT_MAX = 5;
  private static readonly RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 min
  private static readonly RATE_LIMIT_CLEANUP_MS = 5 * 60 * 1000; // cada 5 min

  // Hash bcrypt de un valor fijo que no corresponde a ninguna cuenta real.
  // Se usa para forzar un compare() de igual costo cuando el usuario no
  // existe, y así no filtrar por temporización qué correos están
  // registrados (antes esas rutas retornaban sin llamar a bcrypt).
  private static readonly DUMMY_HASH =
    '$2b$12$VAhhe7e499fw6Y.KWMRuuuF4E1VcWyvPw3PTCNckio5diKNyWxye.';

  // Rate limiting en memoria — válido para instancia única sin Redis
  private loginAttemptsByEmail = new Map<
    string,
    { count: number; lastAttempt: Date }
  >();
  private loginAttemptsByIp = new Map<
    string,
    { count: number; lastAttempt: Date }
  >();

  constructor(
    private readonly dataSource: DataSource,
    private readonly tokenRevocationService: TokenRevocationService,
  ) {
    this.usuarioRepository = dataSource.getRepository(Usuario);
    this.accesoRepository = dataSource.getRepository(Acceso);
    this.accessLogRepository = dataSource.getRepository(AccessLog);
    this.iniciarCleanupRateLimit();
  }

  private iniciarCleanupRateLimit(): void {
    setInterval(() => {
      const ahora = Date.now();
      for (const [key, val] of this.loginAttemptsByEmail) {
        if (
          ahora - val.lastAttempt.getTime() >
          AccesosService.RATE_LIMIT_WINDOW_MS
        ) {
          this.loginAttemptsByEmail.delete(key);
        }
      }
      for (const [key, val] of this.loginAttemptsByIp) {
        if (
          ahora - val.lastAttempt.getTime() >
          AccesosService.RATE_LIMIT_WINDOW_MS
        ) {
          this.loginAttemptsByIp.delete(key);
        }
      }
    }, AccesosService.RATE_LIMIT_CLEANUP_MS);
  }

  private estaEnRateLimit(
    key: string,
    map: Map<string, { count: number; lastAttempt: Date }>,
  ): boolean {
    const entry = map.get(key);
    if (!entry) return false;
    const dentroVentana =
      Date.now() - entry.lastAttempt.getTime() <
      AccesosService.RATE_LIMIT_WINDOW_MS;
    return dentroVentana && entry.count >= AccesosService.RATE_LIMIT_MAX;
  }

  private incrementarRateLimit(
    key: string,
    map: Map<string, { count: number; lastAttempt: Date }>,
  ): void {
    const entry = map.get(key) ?? { count: 0, lastAttempt: new Date() };
    map.set(key, { count: entry.count + 1, lastAttempt: new Date() });
  }

  private resetRateLimit(correoUsuario: string, ip: string): void {
    this.loginAttemptsByEmail.delete(correoUsuario);
    this.loginAttemptsByIp.delete(ip);
  }

  public async login(
    datosLogin: LoginDto,
    ip: string,
    userAgent: string,
  ): Promise<{ mensaje: string; token: string }> {
    const { correoUsuario, claveAcceso } = datosLogin;

    // Solo el límite por IP se evalúa ANTES de verificar credenciales: frena
    // a un origen que esté inundando el endpoint. El límite por correo se
    // evalúa DESPUÉS de un intento fallido (más abajo) y nunca bloquea una
    // contraseña correcta — si bloqueara antes de verificar, cualquiera que
    // conociera el correo de una víctima podría dejarla sin poder iniciar
    // sesión 15 minutos con solo 5 intentos fallidos, sin acertar nada.
    if (this.estaEnRateLimit(ip, this.loginAttemptsByIp)) {
      await this.accessLogRepository.save({
        event: AuditEvent.LOGIN_FAIL,
        ip,
        userAgent,
        details: 'Rate limit por IP excedido',
      });
      throw new HttpException(
        'Demasiados intentos fallidos. Intente más tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { correoUsuario },
      relations: { acceso: true, codRolU: true },
    });

    if (!usuario || !usuario.acceso) {
      // Compara contra un hash dummy para que esta rama tarde lo mismo que
      // la de contraseña incorrecta — evita enumerar correos por temporización.
      await compare(claveAcceso, AccesosService.DUMMY_HASH);
      this.incrementarRateLimit(correoUsuario, this.loginAttemptsByEmail);
      this.incrementarRateLimit(ip, this.loginAttemptsByIp);
      await this.accessLogRepository.save({
        event: AuditEvent.LOGIN_FAIL,
        ip,
        userAgent,
        details: 'Intento de login fallido: correo no encontrado o sin acceso',
      });
      throw new HttpException(
        'Credenciales inválidas',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const passwordValid = await compare(
      claveAcceso,
      usuario.acceso.claveAcceso,
    );

    if (!passwordValid) {
      this.incrementarRateLimit(correoUsuario, this.loginAttemptsByEmail);
      this.incrementarRateLimit(ip, this.loginAttemptsByIp);
      await this.accessLogRepository.save({
        codUsuario: usuario.codUsuario,
        event: AuditEvent.LOGIN_FAIL,
        ip,
        userAgent,
        details: 'Contraseña incorrecta',
      });

      // El límite por correo solo se aplica aquí, tras confirmar que la
      // contraseña era incorrecta: frena a quien adivina sin conocer la
      // clave real, pero el dueño legítimo de la cuenta nunca llega a este
      // punto con su contraseña correcta.
      if (this.estaEnRateLimit(correoUsuario, this.loginAttemptsByEmail)) {
        throw new HttpException(
          'Demasiados intentos fallidos. Intente más tarde.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new HttpException(
        'Credenciales inválidas',
        HttpStatus.UNAUTHORIZED,
      );
    }

    this.resetRateLimit(correoUsuario, ip);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const datosSesion = await this.accesoRepository.query(
      ACCESO_SQL.DATOS_SESION,
      [usuario.codUsuario],
    );

    if (
      !datosSesion ||
      (datosSesion as unknown as Array<unknown>).length === 0
    ) {
      throw new HttpException('Error generando sesión', HttpStatus.CONFLICT);
    }

    const token = GenerarToken.procesarRespuesta(
      (datosSesion as unknown as Array<unknown>)[0] as DatosSesion,
    );

    await this.accessLogRepository.save({
      codUsuario: usuario.codUsuario,
      event: AuditEvent.LOGIN_SUCCESS,
      ip,
      userAgent,
      details: `Login exitoso para ${usuario.nombreUsuario}`,
    });

    return {
      mensaje: 'Inicio de sesión exitoso',
      token,
    };
  }

  public async logout(
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    if (!datosUsuario.exp) {
      throw new HttpException('Token inválido', HttpStatus.BAD_REQUEST);
    }

    await this.tokenRevocationService.revocar(
      datosUsuario.jti,
      new Date(datosUsuario.exp * 1000),
    );

    return { mensaje: 'Sesión cerrada correctamente' };
  }
}
