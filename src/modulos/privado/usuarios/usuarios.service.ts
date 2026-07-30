import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';

import { Usuario } from 'src/modelos/usuario/usuario';
import { Acceso } from 'src/modelos/acceso/acceso';
import { Rol } from 'src/modelos/rol/rol';
import { PasswordResetToken } from 'src/modelos/audit/password-reset-token';
import { Tenant } from 'src/modelos/tenant/tenant';
import { USUARIOS_SQL } from './sql/usuarios.sql';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import {
  esDueno,
  esSuperAdmin,
  obtenerRolUsuario,
  obtenerTenantId,
} from 'src/middleware/seguridad/rol.helper';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class UsuariosService {
  private usuarioRepository: Repository<Usuario>;
  private accesoRepository: Repository<Acceso>;
  private tenantRepository: Repository<Tenant>;
  private rolRepository: Repository<Rol>;

  constructor(private poolConexion: DataSource) {
    this.usuarioRepository = poolConexion.getRepository(Usuario);
    this.accesoRepository = poolConexion.getRepository(Acceso);
    this.tenantRepository = poolConexion.getRepository(Tenant);
    this.rolRepository = poolConexion.getRepository(Rol);
  }

  public async consultar(datosUsuario: SesionUsuario): Promise<unknown> {
    if (esSuperAdmin(obtenerRolUsuario(datosUsuario))) {
      return this.usuarioRepository.query(USUARIOS_SQL.CONSULTAR_TODOS);
    }

    return this.usuarioRepository.query(USUARIOS_SQL.CONSULTAR, [
      obtenerTenantId(datosUsuario),
    ]);
  }

  public async registrar(
    datos: CrearUsuarioDto,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    const existe = await this.usuarioRepository.findOne({
      where: { correoUsuario: datos.correoUsuario },
    });

    if (existe) {
      throw new HttpException(
        'El correo ya está registrado',
        HttpStatus.CONFLICT,
      );
    }

    const rolAsignado = await this.rolRepository.findOneBy({
      codRol: datos.codRol,
    });
    if (!rolAsignado) {
      throw new HttpException('Rol no encontrado', HttpStatus.BAD_REQUEST);
    }

    const actorEsSuperAdmin = esSuperAdmin(obtenerRolUsuario(datosUsuario));

    // El superadministrador nunca se crea por esta vía, ni siquiera por otro
    // superadministrador: la única forma de provisionarlo es SUPERADMIN_EMAIL
    // / SUPERADMIN_PASSWORD en el .env al arrancar (ver SuperAdminService).
    // Sin este chequeo, cualquier DUENO/ADMIN podía listar los roles, ver el
    // codRol del superadministrador y crear un usuario con ese rol para
    // tomar control total de la plataforma.
    if (esSuperAdmin(rolAsignado.nombreRol)) {
      throw new HttpException(
        'El rol superadministrador no se puede asignar desde este endpoint',
        HttpStatus.FORBIDDEN,
      );
    }

    // Solo un dueño (o el superadministrador) puede crear otro dueño: un
    // admin operativo no debe poder mintar una cuenta con más privilegio
    // que la suya propia dentro del mismo tenant.
    if (
      esDueno(rolAsignado.nombreRol) &&
      !esDueno(obtenerRolUsuario(datosUsuario)) &&
      !actorEsSuperAdmin
    ) {
      throw new HttpException(
        'Solo un dueño puede asignar el rol dueño',
        HttpStatus.FORBIDDEN,
      );
    }

    // El tenant nunca viene del cliente salvo para el superadministrador,
    // que no tiene tenant propio y por eso debe indicar a cuál pertenece
    // el nuevo usuario. Cualquier otro actor solo puede crear usuarios en
    // su propio tenant, sin importar lo que envíe en el body.
    let codTenant: number | null;
    if (actorEsSuperAdmin) {
      if (!datos.codTenant) {
        throw new HttpException(
          'codTenant es obligatorio para el superadministrador',
          HttpStatus.BAD_REQUEST,
        );
      }
      const tenant = await this.tenantRepository.findOneBy({
        codTenant: datos.codTenant,
      });
      if (!tenant) {
        throw new HttpException('Tenant no encontrado', HttpStatus.NOT_FOUND);
      }
      codTenant = tenant.codTenant;
    } else {
      codTenant = obtenerTenantId(datosUsuario);
    }

    const queryRunner = this.poolConexion.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const nuevoUsuario = this.usuarioRepository.create({
        nombreUsuario: datos.nombreUsuario,
        correoUsuario: datos.correoUsuario,
        codRol: datos.codRol,
        codTenant,
      });

      const usuarioGuardado = await queryRunner.manager.save(nuevoUsuario);

      const acceso = this.accesoRepository.create({
        codUsuario: usuarioGuardado.codUsuario,
        claveAcceso: await hash(datos.claveAcceso, 12),
      });

      await queryRunner.manager.save(acceso);
      await queryRunner.commitTransaction();

      return { mensaje: 'Usuario registrado correctamente' };
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al registrar usuario',
        HttpStatus.CONFLICT,
      );
    } finally {
      await queryRunner.release();
    }
  }

  public async eliminar(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<{ mensaje: string }> {
    const usuario = await this.usuarioRepository.findOneBy({ codUsuario: id });

    if (!usuario) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }

    const actorEsSuperAdmin = esSuperAdmin(obtenerRolUsuario(datosUsuario));

    if (
      !actorEsSuperAdmin &&
      usuario.codTenant !== obtenerTenantId(datosUsuario)
    ) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }

    // Un admin operativo no puede eliminar al dueño de su propio tenant:
    // eso solo lo puede hacer el dueño mismo (o el superadministrador).
    if (!actorEsSuperAdmin && !esDueno(obtenerRolUsuario(datosUsuario))) {
      const rolObjetivo = await this.rolRepository.findOneBy({
        codRol: usuario.codRol,
      });
      if (rolObjetivo && esDueno(rolObjetivo.nombreRol)) {
        throw new HttpException(
          'Un admin no puede eliminar al dueño del tenant',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    const queryRunner = this.poolConexion.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Acceso y PasswordResetToken son solo plomería de autenticación: no
      // tienen sentido sin el usuario, así que se borran junto con él. Otras
      // tablas (visitas, avisos, paquetes) usan ON DELETE RESTRICT a
      // propósito para preservar el historial — si el usuario tiene
      // registros ahí, el DELETE de abajo fallará por FK y se traduce en
      // un 409 claro, no en un 500.
      await queryRunner.manager.delete(PasswordResetToken, { userId: id });
      await queryRunner.manager.delete(Acceso, { codUsuario: id });
      await queryRunner.manager.delete(Usuario, id);

      await queryRunner.commitTransaction();

      return { mensaje: 'Usuario eliminado correctamente' };
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();

      const errorBd = error as { code?: string };
      if (errorBd.code === '23503') {
        throw new HttpException(
          'No se puede eliminar: el usuario tiene registros asociados (visitas, avisos, paquetes u otros)',
          HttpStatus.CONFLICT,
        );
      }

      throw new HttpException(
        'Error al eliminar usuario',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
