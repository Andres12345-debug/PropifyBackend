import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { CuentaMensual } from 'src/modelos/cuenta-mensual/cuenta-mensual';
import { CargoDetalle } from 'src/modelos/cargo-detalle/cargo-detalle';
import { Residente } from 'src/modelos/residente/residente';
import {
  RoleNames,
  obtenerTenantId,
  obtenerUsuarioId,
  tieneRol,
} from 'src/middleware/seguridad/rol.helper';
import { verificarTenant } from 'src/middleware/seguridad/tenant.helper';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class CuentasMensualesService {
  private cuentaRepository: Repository<CuentaMensual>;
  private residenteRepository: Repository<Residente>;

  constructor(private readonly poolConexion: DataSource) {
    this.cuentaRepository = poolConexion.getRepository(CuentaMensual);
    this.residenteRepository = poolConexion.getRepository(Residente);
  }

  // Todas las cuentas del tenant (DUEÑO/ADMIN) — se resuelve el tenant vía
  // residente -> unidad -> inmueble.
  public async consultarTodas(
    datosUsuario: SesionUsuario,
  ): Promise<CuentaMensual[]> {
    return this.cuentaRepository
      .createQueryBuilder('cuenta')
      .innerJoin(
        'residentes',
        'residente',
        'residente.cod_residente = cuenta.cod_residente',
      )
      .innerJoin(
        'unidades',
        'unidad',
        'unidad.cod_unidad = residente.cod_unidad',
      )
      .innerJoin(
        'inmuebles',
        'inmueble',
        'inmueble.cod_inmueble = unidad.cod_inmueble',
      )
      .where('inmueble.cod_tenant = :tenantId', {
        tenantId: obtenerTenantId(datosUsuario),
      })
      .orderBy('cuenta.creado_en', 'DESC')
      .getMany();
  }

  // Solo las cuentas del residente logueado.
  public async consultarMias(
    datosUsuario: SesionUsuario,
  ): Promise<CuentaMensual[]> {
    const residente = await this.residenteRepository.findOneBy({
      codUsuario: obtenerUsuarioId(datosUsuario)!,
    });
    if (!residente) {
      throw new HttpException(
        'No tienes un registro de residente asociado',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.cuentaRepository.find({
      where: { codResidente: residente.codResidente },
      order: { creadoEn: 'DESC' },
    });
  }

  public async consultarUna(
    id: number,
    datosUsuario: SesionUsuario,
  ): Promise<{ cuenta: CuentaMensual; cargos: CargoDetalle[] }> {
    const cuenta = await this.cuentaRepository.findOneBy({ codCuenta: id });
    if (!cuenta) {
      throw new HttpException('Cuenta no encontrada', HttpStatus.NOT_FOUND);
    }

    const residente = await this.residenteRepository.findOneBy({
      codResidente: cuenta.codResidente,
    });

    const esResidente = tieneRol(datosUsuario, RoleNames.RESIDENTE);
    if (esResidente) {
      if (residente?.codUsuario !== obtenerUsuarioId(datosUsuario)) {
        throw new HttpException('Cuenta no encontrada', HttpStatus.NOT_FOUND);
      }
    } else {
      const tenantResultado = await this.cuentaRepository
        .createQueryBuilder('cuenta')
        .innerJoin(
          'residentes',
          'residente',
          'residente.cod_residente = cuenta.cod_residente',
        )
        .innerJoin(
          'unidades',
          'unidad',
          'unidad.cod_unidad = residente.cod_unidad',
        )
        .innerJoin(
          'inmuebles',
          'inmueble',
          'inmueble.cod_inmueble = unidad.cod_inmueble',
        )
        .select('inmueble.cod_tenant', 'codTenant')
        .where('cuenta.cod_cuenta = :id', { id })
        .getRawOne<{ codTenant: number }>();
      verificarTenant(
        tenantResultado?.codTenant,
        datosUsuario,
        'Cuenta no encontrada',
      );
    }

    const cargos = await this.poolConexion
      .getRepository(CargoDetalle)
      .find({ where: { codCuenta: id } });

    return { cuenta, cargos };
  }
}
