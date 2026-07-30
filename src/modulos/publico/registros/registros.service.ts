import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Acceso } from 'src/modelos/acceso/acceso';
import { AccessLog, AuditEvent } from 'src/modelos/audit/access-log';
import { PasswordResetToken } from 'src/modelos/audit/password-reset-token';
import { Rol } from 'src/modelos/rol/rol';
import { Usuario } from 'src/modelos/usuario/usuario';
import { Tenant } from 'src/modelos/tenant/tenant';
import { DataSource, Repository } from 'typeorm';
import { ACCESO_SQL } from '../accesos/accesos.sql';
import GenerarToken, {
  type DatosSesion,
} from 'src/utilidades/compartido/generarToken';
import { RegistroDto } from './dto/registroDto';
import { CrearTenantDto } from './dto/crear-tenant.dto';
import { RecuperarContraseniaDto } from './dto/recuperar-contrasenia.dto';
import { NuevaContraseniaDto } from './dto/nueva-contrasenia';
import { CambioPasswordDto } from './dto/cambio-password.dto';
import { CorreoService } from '../correo/correo.service';
import { RoleNames } from 'src/middleware/seguridad/rol.helper';
import { hashToken } from 'src/utilidades/compartido/hash-token';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

const LIMPIEZA_TOKENS_INTERVAL_MS = 60 * 60 * 1000; // 1 hora

@Injectable()
export class RegistrosService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RegistrosService.name);
  private usuarioRepositorio: Repository<Usuario>;
  private accesoRepositorio: Repository<Acceso>;
  private accessLogRepositorio: Repository<AccessLog>;
  private passwordResetTokenRepositorio: Repository<PasswordResetToken>;
  private rolesRepositorio: Repository<Rol>;
  private tenantRepositorio: Repository<Tenant>;
  private limpiezaHandle?: ReturnType<typeof setInterval>;

  constructor(
    private poolConexion: DataSource,
    private mailService: CorreoService,
  ) {
    this.usuarioRepositorio = poolConexion.getRepository(Usuario);
    this.accesoRepositorio = poolConexion.getRepository(Acceso);
    this.accessLogRepositorio = poolConexion.getRepository(AccessLog);
    this.passwordResetTokenRepositorio =
      poolConexion.getRepository(PasswordResetToken);
    this.rolesRepositorio = poolConexion.getRepository(Rol);
    this.tenantRepositorio = poolConexion.getRepository(Tenant);
  }

  // A diferencia de revoked_tokens (limpiado cada hora por
  // TokenRevocationService), password_reset_tokens no tenía ninguna
  // limpieza: los usados/expirados se acumulaban para siempre, y además
  // bloqueaban el borrado del usuario dueño (ver UsuariosService.eliminar).
  onModuleInit() {
    this.limpiezaHandle = setInterval(() => {
      void this.limpiarTokensDeReset();
    }, LIMPIEZA_TOKENS_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.limpiezaHandle) clearInterval(this.limpiezaHandle);
  }

  private async limpiarTokensDeReset(): Promise<void> {
    await this.passwordResetTokenRepositorio
      .createQueryBuilder()
      .delete()
      .where('used = :used', { used: true })
      .orWhere('expires_at < :ahora', { ahora: new Date() })
      .execute();
  }

  // ALTA DE TENANT NUEVO (autoservicio): crea el Tenant y su primer
  // usuario, con rol DUEÑO, en una sola transacción.
  public async nuevoTenant(
    datos: CrearTenantDto,
    ip: string,
    userAgent: string,
  ): Promise<{ token: string }> {
    const queryRunner = this.poolConexion.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const usuarioExisteCorreo = await queryRunner.manager
        .getRepository(Usuario)
        .findOne({ where: { correoUsuario: datos.correoUsuario } });
      if (usuarioExisteCorreo) {
        throw new HttpException(
          'El correo ya está registrado',
          HttpStatus.CONFLICT,
        );
      }

      const rolDueno = await this.rolesRepositorio.findOne({
        where: { nombreRol: RoleNames.DUENO },
      });
      if (!rolDueno) {
        throw new HttpException(
          'Rol dueño no configurado',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const nuevoTenant = queryRunner.manager
        .getRepository(Tenant)
        .create({ nombre: datos.nombreTenant });
      const tenantGuardado = await queryRunner.manager.save(nuevoTenant);

      const nuevoDueno = this.usuarioRepositorio.create({
        nombreUsuario: datos.nombreUsuario,
        correoUsuario: datos.correoUsuario,
        codRol: rolDueno.codRol,
        codTenant: tenantGuardado.codTenant,
      });
      const duenoGuardado = await queryRunner.manager.save(nuevoDueno);

      const claveCifrada = await bcrypt.hash(datos.claveAcceso, 12);
      const nuevoAcceso = this.accesoRepositorio.create({
        codUsuario: duenoGuardado.codUsuario,
        claveAcceso: claveCifrada,
      });
      await queryRunner.manager.save(nuevoAcceso);

      await queryRunner.commitTransaction();

      await this.accessLogRepositorio.save({
        codUsuario: duenoGuardado.codUsuario,
        event: AuditEvent.REGISTER,
        ip,
        userAgent,
        details: `Tenant registrado: ${tenantGuardado.nombre} (dueño: ${duenoGuardado.nombreUsuario})`,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const sesionRows = await this.poolConexion.query(
        ACCESO_SQL.DATOS_SESION,
        [duenoGuardado.codUsuario],
      );
      const token = GenerarToken.procesarRespuesta(
        (sesionRows as DatosSesion[])[0],
      );

      return { token };
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      const errorBd = error as { code?: string };
      if (errorBd.code === '23505') {
        throw new HttpException(
          'El correo ya está registrado',
          HttpStatus.CONFLICT,
        );
      }
      throw new HttpException(
        'No se pudo completar el registro del tenant',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // REGISTRO NUEVO USUARIO
  public async nuevoUsuario(
    datosRegistro: RegistroDto,
    ip: string,
    userAgent: string,
  ): Promise<{ token: string }> {
    const queryRunner = this.poolConexion.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const usuarioExisteCorreo = await queryRunner.manager
        .getRepository(Usuario)
        .findOne({ where: { correoUsuario: datosRegistro.correoUsuario } });
      if (usuarioExisteCorreo) {
        throw new HttpException(
          'El correo ya está registrado',
          HttpStatus.CONFLICT,
        );
      }

      // Riesgo conocido y aceptado (bajo): codTenant es un entero secuencial
      // adivinable, y este endpoint es público — alguien puede enumerar qué
      // tenants existen y están activos probando IDs consecutivos (mitigado
      // parcialmente por el throttle de 5/min en el controller, pero no
      // eliminado). La solución de fondo es reemplazar codTenant por un
      // código de invitación con suficiente entropía que el dueño del
      // tenant comparta con sus residentes; requiere definir ese flujo de
      // invitación y cambiar el contrato de este endpoint, así que se deja
      // pendiente hasta que se decida el diseño real.
      const tenant = await this.tenantRepositorio.findOneBy({
        codTenant: datosRegistro.codTenant,
      });
      if (!tenant || !tenant.activo) {
        throw new HttpException('Tenant no encontrado', HttpStatus.NOT_FOUND);
      }

      // El rol nunca viene del cliente: el autorregistro público siempre
      // asigna RESIDENTE. Asignar roles administrativos o CELADOR es
      // responsabilidad exclusiva de un DUEÑO/ADMIN vía POST /privado/usuarios.
      const rolBase = await this.rolesRepositorio.findOne({
        where: { nombreRol: RoleNames.RESIDENTE },
      });
      if (!rolBase) {
        throw new HttpException(
          'Rol por defecto no configurado',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const nuevoUsuario = this.usuarioRepositorio.create({
        nombreUsuario: datosRegistro.nombreUsuario,
        correoUsuario: datosRegistro.correoUsuario,
        codRol: rolBase.codRol,
        codTenant: tenant.codTenant,
      });

      const usuarioGuardado = await queryRunner.manager.save(nuevoUsuario);

      const claveCifrada = await bcrypt.hash(datosRegistro.claveAcceso, 12);
      const nuevoAcceso = this.accesoRepositorio.create({
        codUsuario: usuarioGuardado.codUsuario,
        claveAcceso: claveCifrada,
      });

      await queryRunner.manager.save(nuevoAcceso);
      await queryRunner.commitTransaction();

      await this.accessLogRepositorio.save({
        codUsuario: usuarioGuardado.codUsuario,
        event: AuditEvent.REGISTER,
        ip,
        userAgent,
        details: `Usuario registrado: ${usuarioGuardado.nombreUsuario}`,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const sesionRows = await this.poolConexion.query(
        ACCESO_SQL.DATOS_SESION,
        [usuarioGuardado.codUsuario],
      );
      const token = GenerarToken.procesarRespuesta(
        (sesionRows as DatosSesion[])[0],
      );

      return { token };
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      // Red de seguridad ante una carrera real entre dos registros
      // simultáneos con el mismo correo: el chequeo de unicidad de arriba
      // corre dentro de la transacción y puede ser rebasado por otra
      // transacción concurrente; el constraint UNIQUE de la BD es quien
      // realmente lo impide, y aquí lo traducimos a un mensaje claro.
      const errorBd = error as { code?: string };
      if (errorBd.code === '23505') {
        throw new HttpException(
          'El correo ya está registrado',
          HttpStatus.CONFLICT,
        );
      }
      throw new HttpException(
        'No se pudo completar el registro',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // RECUPERAR CONTRASEÑA
  public async recuperarContrasenia(
    datos: RecuperarContraseniaDto,
    ip: string,
    userAgent: string,
  ): Promise<{ mensaje: string }> {
    const usuario = await this.usuarioRepositorio.findOne({
      where: { correoUsuario: datos.correoUsuario },
    });

    // Siempre enviar el mismo mensaje para evitar enumeración de usuarios
    const mensaje =
      'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';

    if (usuario) {
      // Invalidar tokens de reset anteriores del mismo usuario — evita que
      // queden varios enlaces válidos simultáneamente
      await this.passwordResetTokenRepositorio.update(
        { userId: usuario.codUsuario, used: false },
        { used: true },
      );

      // El token en texto plano solo vive en el enlace del correo; en BD se
      // guarda su hash (ver hallazgo de auditoría: una fuga de la tabla no
      // debe exponer enlaces de reset todavía válidos).
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

      await this.passwordResetTokenRepositorio.save({
        token: hashToken(token),
        userId: usuario.codUsuario,
        expiresAt,
        used: false,
      });

      const enlace = `${process.env.FRONTEND_URL}/reset-password/${token}`;

      // No se espera el envío del correo: si se hiciera, la latencia del
      // SMTP (o un fallo de envío) sería distinguible de la respuesta que
      // recibe alguien que pidió un reset para un correo que no existe,
      // filtrando por temporización/errores qué cuentas son reales.
      void this.mailService
        .enviarCorreo(
          datos.correoUsuario,
          'Restablece tu contraseña - Propify',
          this.generarPlantillaCorreo(enlace, usuario.nombreUsuario),
        )
        .catch((error: unknown) => {
          this.logger.error(
            `Error enviando correo de recuperación a ${datos.correoUsuario}`,
            error instanceof Error ? error.stack : String(error),
          );
        });

      await this.accessLogRepositorio.save({
        codUsuario: usuario.codUsuario,
        event: AuditEvent.PASSWORD_RESET_REQUEST,
        ip,
        userAgent,
        details: `Solicitud de recuperación para ${datos.correoUsuario}`,
      });
    }

    return { mensaje };
  }

  // CAMBIAR CONTRASEÑA (vía token de recuperación)
  public async cambiarContrasenia(
    token: string,
    datos: NuevaContraseniaDto,
    ip: string,
    userAgent: string,
  ): Promise<{ mensaje: string }> {
    const resetToken = await this.passwordResetTokenRepositorio.findOne({
      where: { token: hashToken(token), used: false },
      relations: ['usuario'],
    });

    if (!resetToken) {
      throw new HttpException(
        'Token inválido o ya utilizado',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (resetToken.expiresAt < new Date()) {
      throw new HttpException('Token expirado', HttpStatus.UNAUTHORIZED);
    }

    const usuarioId = resetToken.userId;

    const accesoActual = await this.accesoRepositorio.findOne({
      where: { codUsuario: usuarioId },
    });
    if (
      accesoActual &&
      (await bcrypt.compare(datos.nuevaClave, accesoActual.claveAcceso))
    ) {
      throw new HttpException(
        'La nueva contraseña no puede ser igual a la actual',
        HttpStatus.BAD_REQUEST,
      );
    }

    const nuevaClaveHashed = await bcrypt.hash(datos.nuevaClave, 12);
    await this.actualizarContrasenia(usuarioId, nuevaClaveHashed);

    await this.passwordResetTokenRepositorio.update(
      { id: resetToken.id },
      { used: true },
    );

    await this.accessLogRepositorio.save({
      codUsuario: usuarioId,
      event: AuditEvent.PASSWORD_RESET_SUCCESS,
      ip,
      userAgent,
      details: 'Contraseña cambiada exitosamente vía reset',
    });

    return { mensaje: 'Contraseña actualizada correctamente' };
  }

  private async actualizarContrasenia(codUsuario: number, nuevaClave: string) {
    await this.accesoRepositorio.update(
      { codUsuario },
      { claveAcceso: nuevaClave },
    );
    // Marca el cambio para que JwtGuard invalide cualquier sesión emitida
    // antes de este momento (ver passwordChangedAt en Usuario).
    await this.usuarioRepositorio.update(
      { codUsuario },
      { passwordChangedAt: new Date() },
    );
  }

  // CAMBIAR CONTRASEÑA CUANDO ESTÁ LOGUEADO
  public async cambiarPasswordLogueado(
    datos: CambioPasswordDto,
    datosUsuario: SesionUsuario,
    ip: string,
    userAgent: string,
  ): Promise<{ mensaje: string }> {
    const usuarioId = Number(datosUsuario.sub);

    const accesoActual = await this.accesoRepositorio.findOne({
      where: { codUsuario: usuarioId },
    });
    if (!accesoActual) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }

    const passwordValid = await bcrypt.compare(
      datos.claveActual,
      accesoActual.claveAcceso,
    );
    if (!passwordValid) {
      await this.accessLogRepositorio.save({
        codUsuario: usuarioId,
        event: AuditEvent.PASSWORD_CHANGE,
        ip,
        userAgent,
        details:
          'Intento de cambio de contraseña fallido: contraseña actual incorrecta',
      });
      throw new HttpException(
        'Contraseña actual incorrecta',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (await bcrypt.compare(datos.nuevaClave, accesoActual.claveAcceso)) {
      throw new HttpException(
        'La nueva contraseña no puede ser igual a la actual',
        HttpStatus.BAD_REQUEST,
      );
    }

    const nuevaClaveHashed = await bcrypt.hash(datos.nuevaClave, 12);
    await this.actualizarContrasenia(usuarioId, nuevaClaveHashed);

    await this.accessLogRepositorio.save({
      codUsuario: usuarioId,
      event: AuditEvent.PASSWORD_CHANGE,
      ip,
      userAgent,
      details: 'Contraseña cambiada exitosamente',
    });

    return { mensaje: 'Contraseña cambiada correctamente' };
  }

  private generarPlantillaCorreo(
    enlace: string,
    nombreUsuario: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Restablece tu contraseña</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            padding: 20px 0;
            background-color: #0f766e;
            color: #ffffff;
            border-radius: 8px 8px 0 0;
          }
          .content {
            padding: 20px;
            text-align: center;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #0f766e;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #666666;
            font-size: 12px;
          }
          .warning {
            color: #dc3545;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Propify</h1>
            <p>Restablece tu contraseña</p>
          </div>
          <div class="content">
            <h2>Hola ${nombreUsuario},</h2>
            <p>Hemos recibido una solicitud para restablecer tu contraseña. Si no solicitaste este cambio, puedes ignorar este correo.</p>
            <p>Para restablecer tu contraseña, haz clic en el botón de abajo:</p>
            <a href="${enlace}" class="button">Restablecer Contraseña</a>
            <p class="warning">Este enlace expira en 15 minutos por seguridad.</p>
            <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <p><a href="${enlace}">${enlace}</a></p>
          </div>
          <div class="footer">
            <p>Si tienes alguna pregunta, contáctanos en soporte@propify.com</p>
            <p>&copy; ${new Date().getFullYear()} Propify. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
