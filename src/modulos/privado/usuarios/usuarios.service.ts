import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';

import { Usuario } from 'src/modelos/usuario/usuario';
import { Acceso } from 'src/modelos/acceso/acceso';
import { USUARIOS_SQL } from './sql/usuarios.sql';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { obtenerTenantId } from 'src/middleware/seguridad/rol.helper';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class UsuariosService {
  private usuarioRepository: Repository<Usuario>;
  private accesoRepository: Repository<Acceso>;

  constructor(private poolConexion: DataSource) {
    this.usuarioRepository = poolConexion.getRepository(Usuario);
    this.accesoRepository = poolConexion.getRepository(Acceso);
  }

  public async consultar(datosUsuario: SesionUsuario): Promise<unknown> {
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

    const queryRunner = this.poolConexion.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const nuevoUsuario = this.usuarioRepository.create({
        nombreUsuario: datos.nombreUsuario,
        correoUsuario: datos.correoUsuario,
        codRol: datos.codRol,
        codTenant: obtenerTenantId(datosUsuario)!,
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

    if (!usuario || usuario.codTenant !== obtenerTenantId(datosUsuario)) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }

    await this.usuarioRepository.delete(id);

    return { mensaje: 'Usuario eliminado correctamente' };
  }
}
