import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { Rol } from 'src/modelos/rol/rol';
import { Usuario } from 'src/modelos/usuario/usuario';
import { Acceso } from 'src/modelos/acceso/acceso';
import { Tenant, PlanTipo } from 'src/modelos/tenant/tenant';
import { RolesService } from 'src/modulos/privado/roles/roles.service';
import { RoleNames } from 'src/middleware/seguridad/rol.helper';

const ROLES_BASE = [
  RoleNames.DUENO,
  RoleNames.ADMIN,
  RoleNames.RESIDENTE,
  RoleNames.CELADOR,
];
const REGEX_COMPLEJIDAD_PASSWORD =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/;

function generarContraseñaAleatoria(longitud = 16): string {
  const mayusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const minusculas = 'abcdefghijklmnopqrstuvwxyz';
  const numeros = '0123456789';
  const especiales = '@#$%*!&';
  const todos = mayusculas + minusculas + numeros + especiales;

  let contrasena = '';
  contrasena += mayusculas[Math.floor(Math.random() * mayusculas.length)];
  contrasena += minusculas[Math.floor(Math.random() * minusculas.length)];
  contrasena += numeros[Math.floor(Math.random() * numeros.length)];
  contrasena += especiales[Math.floor(Math.random() * especiales.length)];

  for (let i = 4; i < longitud; i++) {
    contrasena += todos[Math.floor(Math.random() * todos.length)];
  }

  return contrasena
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly rolesService: RolesService,
    private readonly poolConexion: DataSource,
  ) {}

  async onModuleInit() {
    await this.crearRolesBase();
    await this.crearAdminDemostracion();
  }

  private async crearRolesBase() {
    for (const nombreRol of ROLES_BASE) {
      const existe = await this.rolesService.verificarRol(nombreRol);

      if (!existe) {
        const nuevoRol = new Rol();
        nuevoRol.nombreRol = nombreRol;
        nuevoRol.estadoRol = 1;

        await this.rolesService.registrar(nuevoRol);
        this.logger.log(`Rol '${nombreRol}' creado automáticamente`);
      }
    }
  }

  private async crearAdminDemostracion() {
    const adminEmail = process.env.SEED_ADMIN_EMAIL;

    // Sin SEED_ADMIN_EMAIL configurado no se crea ningún admin automático,
    // en ningún ambiente. Evita depender de un correo por defecto conocido.
    if (!adminEmail) {
      this.logger.warn(
        'No se creó admin automático: configure SEED_ADMIN_EMAIL (y opcionalmente ' +
          'SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME) en el .env si lo desea.',
      );
      return;
    }

    const usuarioRepo = this.poolConexion.getRepository(Usuario);
    const accesoRepo = this.poolConexion.getRepository(Acceso);
    const tenantRepo = this.poolConexion.getRepository(Tenant);

    const adminExiste = await usuarioRepo.findOne({
      where: { correoUsuario: adminEmail },
    });
    if (adminExiste) {
      this.logger.log(`Usuario admin ya existe: ${adminEmail}`);
      return;
    }

    // El admin de arranque es el DUEÑO de un tenant demo — Propify es
    // multi-tenant, así que todo usuario necesita un tenant al que
    // pertenecer. Si no existe todavía, se crea uno.
    let tenantDemo = await tenantRepo.findOne({
      where: { nombre: 'Tenant Demo' },
    });
    if (!tenantDemo) {
      tenantDemo = await tenantRepo.save(
        tenantRepo.create({ nombre: 'Tenant Demo', plan: PlanTipo.CASAS }),
      );
      this.logger.log('Tenant demo creado automáticamente');
    }

    const rolAdmin = await this.poolConexion
      .getRepository(Rol)
      .findOne({ where: { nombreRol: RoleNames.DUENO } });
    if (!rolAdmin) {
      this.logger.error(
        'No se pudo crear el admin: el rol dueño no existe todavía.',
      );
      return;
    }

    // La contraseña SIEMPRE sale de una variable de entorno o se genera
    // aleatoriamente; nunca queda un valor fijo conocido en el código.
    const passwordEnv = process.env.SEED_ADMIN_PASSWORD;
    let contrasena: string;
    let contrasenaGenerada = false;

    if (passwordEnv) {
      if (!REGEX_COMPLEJIDAD_PASSWORD.test(passwordEnv)) {
        this.logger.error(
          'SEED_ADMIN_PASSWORD no cumple los requisitos mínimos (8-128 caracteres, ' +
            'mayúscula, minúscula, número y carácter especial). No se creó el admin.',
        );
        return;
      }
      contrasena = passwordEnv;
    } else {
      contrasena = generarContraseñaAleatoria();
      contrasenaGenerada = true;
    }

    const nombreAdmin = process.env.SEED_ADMIN_NAME || 'Administrador Propify';

    const queryRunner = this.poolConexion.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const nuevoAdmin = usuarioRepo.create({
        nombreUsuario: nombreAdmin,
        correoUsuario: adminEmail,
        codTenant: tenantDemo.codTenant,
        codRol: rolAdmin.codRol,
      });
      const adminGuardado = await queryRunner.manager.save(nuevoAdmin);

      const nuevoAcceso = accesoRepo.create({
        codUsuario: adminGuardado.codUsuario,
        claveAcceso: await bcrypt.hash(contrasena, 12),
      });
      await queryRunner.manager.save(nuevoAcceso);

      await queryRunner.commitTransaction();

      this.logger.log(`Usuario admin creado: ${adminEmail}`);
      if (contrasenaGenerada) {
        this.logger.warn(`Contraseña generada automáticamente: ${contrasena}`);
        this.logger.warn(
          'Guárdela en lugar seguro — no se volverá a mostrar. Configure ' +
            'SEED_ADMIN_PASSWORD para fijar una contraseña propia.',
        );
      } else {
        this.logger.log('Contraseña tomada de SEED_ADMIN_PASSWORD');
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        'Error al crear admin de demostración',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      await queryRunner.release();
    }
  }
}
