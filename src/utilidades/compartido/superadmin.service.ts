import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { Rol } from 'src/modelos/rol/rol';
import { Usuario } from 'src/modelos/usuario/usuario';
import { Acceso } from 'src/modelos/acceso/acceso';
import { RolesService } from 'src/modulos/privado/roles/roles.service';
import { RoleNames } from 'src/middleware/seguridad/rol.helper';

const REGEX_COMPLEJIDAD_PASSWORD =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/;

// Bootstrap del rol de control total de la plataforma. Deliberadamente
// separado de SeedService: el superadministrador no es un dato de
// demostración ni está atado a un tenant — sale exclusivamente de
// SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD/SUPERADMIN_NAME en el .env, y a
// diferencia del admin demo, nunca se genera una contraseña aleatoria: si
// no se configura una que cumpla la política, no se crea la cuenta.
@Injectable()
export class SuperAdminService implements OnModuleInit {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    private readonly rolesService: RolesService,
    private readonly poolConexion: DataSource,
  ) {}

  async onModuleInit() {
    await this.crearSuperAdmin();
  }

  private async crearSuperAdmin() {
    const existeRol = await this.rolesService.verificarRol(
      RoleNames.SUPERADMIN,
    );
    if (!existeRol) {
      const nuevoRol = new Rol();
      nuevoRol.nombreRol = RoleNames.SUPERADMIN;
      nuevoRol.estadoRol = 1;
      await this.rolesService.registrar(nuevoRol);
      this.logger.log(`Rol '${RoleNames.SUPERADMIN}' creado automáticamente`);
    }

    const email = process.env.SUPERADMIN_EMAIL;
    if (!email) {
      this.logger.warn(
        'No se creó superadministrador: configure SUPERADMIN_EMAIL y ' +
          'SUPERADMIN_PASSWORD en el .env si necesita esta cuenta de control total.',
      );
      return;
    }

    const usuarioRepo = this.poolConexion.getRepository(Usuario);
    const accesoRepo = this.poolConexion.getRepository(Acceso);

    const yaExiste = await usuarioRepo.findOne({
      where: { correoUsuario: email },
    });
    if (yaExiste) {
      this.logger.log(`Superadministrador ya existe: ${email}`);
      return;
    }

    const password = process.env.SUPERADMIN_PASSWORD;
    if (!password || !REGEX_COMPLEJIDAD_PASSWORD.test(password)) {
      this.logger.error(
        'No se creó superadministrador: SUPERADMIN_PASSWORD falta o no cumple ' +
          'la política (8-128 caracteres, mayúscula, minúscula, número y carácter especial). ' +
          'Esta cuenta nunca se crea con una contraseña generada automáticamente.',
      );
      return;
    }

    const rolSuperAdmin = await this.poolConexion
      .getRepository(Rol)
      .findOne({ where: { nombreRol: RoleNames.SUPERADMIN } });
    if (!rolSuperAdmin) {
      this.logger.error(
        'No se pudo crear el superadministrador: el rol no existe todavía.',
      );
      return;
    }

    const nombre = process.env.SUPERADMIN_NAME || 'Super Administrador';

    const queryRunner = this.poolConexion.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const nuevoUsuario = usuarioRepo.create({
        nombreUsuario: nombre,
        correoUsuario: email,
        codTenant: null,
        codRol: rolSuperAdmin.codRol,
      });
      const usuarioGuardado = await queryRunner.manager.save(nuevoUsuario);

      const nuevoAcceso = accesoRepo.create({
        codUsuario: usuarioGuardado.codUsuario,
        claveAcceso: await bcrypt.hash(password, 12),
      });
      await queryRunner.manager.save(nuevoAcceso);

      await queryRunner.commitTransaction();
      this.logger.log(`Superadministrador creado: ${email}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        'Error al crear el superadministrador',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      await queryRunner.release();
    }
  }
}
