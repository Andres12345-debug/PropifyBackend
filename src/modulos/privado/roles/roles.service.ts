import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Rol } from 'src/modelos/rol/rol';
import { DataSource, Repository } from 'typeorm';
import { CrearRolDto } from './dto/crearRol.dto';

@Injectable()
export class RolesService {
  private rolesRepository: Repository<Rol>;

  constructor(private poolConexion: DataSource) {
    this.rolesRepository = poolConexion.getRepository(Rol);
  }

  // 🔹 Consultar todos
  public async consultar(): Promise<Rol[]> {
    return this.rolesRepository.find();
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
  public async consultarUno(id: number): Promise<Rol> {
    const rol = await this.rolesRepository.findOneBy({ codRol: id });

    if (!rol) {
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

    await this.rolesRepository.update(id, {
      nombreRol: datos.nombreRol?.trim().toLowerCase(),
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

    await this.rolesRepository.delete(id);

    return {
      mensaje: 'Rol eliminado correctamente',
    };
  }
}
