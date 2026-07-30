import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Rol } from 'src/modelos/rol/rol';
import { DataSource, Repository } from 'typeorm';
import { CrearRolDto } from './dto/crearRol.dto';
import {
  esSuperAdmin,
  obtenerRolUsuario,
} from 'src/middleware/seguridad/rol.helper';
import { esViolacionForeignKey } from 'src/utilidades/compartido/fk-conflict.helper';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class RolesService {
  private rolesRepository: Repository<Rol>;

  constructor(private poolConexion: DataSource) {
    this.rolesRepository = poolConexion.getRepository(Rol);
  }

  // 🔹 Consultar todos
  // El rol superadministrador nunca se muestra a un DUENO/ADMIN: es un rol
  // de plataforma, no de negocio, y no deben ni conocer su codRol (ver
  // hallazgo de auditoría: se usaba para auto-escalar creando un usuario
  // con ese codRol vía POST /privado/usuarios).
  public async consultar(datosUsuario: SesionUsuario): Promise<Rol[]> {
    const roles = await this.rolesRepository.find();

    if (esSuperAdmin(obtenerRolUsuario(datosUsuario))) {
      return roles;
    }

    return roles.filter((rol) => !esSuperAdmin(rol.nombreRol));
  }

  // 🔹 Verificar existencia
  public async verificarRol(nombre: string): Promise<boolean> {
    const nombreNormalizado = nombre.trim().toLowerCase();

    const existe = await this.rolesRepository.findOne({
      where: { nombreRol: nombreNormalizado },
    });

    return !!existe;
  }

  // 🔹 Registrar
  public async registrar(datos: CrearRolDto): Promise<any> {
    const nombreNormalizado = datos.nombreRol.trim().toLowerCase();

    if (await this.verificarRol(nombreNormalizado)) {
      throw new HttpException('El rol ya existe', HttpStatus.CONFLICT);
    }

    const nuevoRol = this.rolesRepository.create({
      nombreRol: nombreNormalizado,
      estadoRol: datos.estadoRol ?? 1,
    });

    const guardado = await this.rolesRepository.save(nuevoRol);

    return {
      mensaje: 'Rol registrado correctamente',
      rol: guardado,
    };
  }

  // 🔹 Consultar uno
  public async consultarUno(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<Rol> {
    const rol = await this.rolesRepository.findOneBy({ codRol: id });

    if (
      !rol ||
      (esSuperAdmin(rol.nombreRol) &&
        !esSuperAdmin(obtenerRolUsuario(datosUsuario)))
    ) {
      // Mismo motivo que en NotFoundException de tenant.helper: no revelar
      // ni siquiera que ese codRol corresponde al superadministrador.
      throw new HttpException('Rol no encontrado', HttpStatus.NOT_FOUND);
    }

    return rol;
  }

  // 🔹 Actualizar
  public async actualizar(datos: CrearRolDto, id: number) {
    const rol = await this.rolesRepository.findOneBy({ codRol: id });

    if (!rol) {
      throw new HttpException('Rol no encontrado', HttpStatus.NOT_FOUND);
    }

    const nombreNormalizado = datos.nombreRol?.trim().toLowerCase();

    if (nombreNormalizado && nombreNormalizado !== rol.nombreRol) {
      const yaExiste = await this.rolesRepository.findOne({
        where: { nombreRol: nombreNormalizado },
      });
      if (yaExiste) {
        throw new HttpException('El rol ya existe', HttpStatus.CONFLICT);
      }
    }

    await this.rolesRepository.update(id, {
      nombreRol: nombreNormalizado,
      estadoRol: datos.estadoRol,
    });

    return {
      mensaje: 'Rol actualizado correctamente',
    };
  }

  // 🔹 Eliminar
  public async eliminar(id: number) {
    const rol = await this.rolesRepository.findOneBy({ codRol: id });

    if (!rol) {
      throw new HttpException('Rol no encontrado', HttpStatus.NOT_FOUND);
    }

    try {
      await this.rolesRepository.delete(id);
    } catch (error: unknown) {
      if (esViolacionForeignKey(error)) {
        throw new HttpException(
          'No se puede eliminar: hay usuarios con este rol asignado',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }

    return {
      mensaje: 'Rol eliminado correctamente',
    };
  }
}
