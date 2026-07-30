import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Pago } from 'src/modelos/pago/pago';
import {
  CuentaMensual,
  EstadoCuenta,
} from 'src/modelos/cuenta-mensual/cuenta-mensual';
import { verificarTenant } from 'src/middleware/seguridad/tenant.helper';
import { CrearPagoDto } from './dto/crear-pago.dto';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class PagosService {
  private pagoRepository: Repository<Pago>;
  private cuentaRepository: Repository<CuentaMensual>;

  constructor(private readonly poolConexion: DataSource) {
    this.pagoRepository = poolConexion.getRepository(Pago);
    this.cuentaRepository = poolConexion.getRepository(CuentaMensual);
  }

  private async verificarCuentaDelTenant(
    codCuenta: number,
    datosUsuario: SesionUsuario,
  ): Promise<CuentaMensual> {
    const cuenta = await this.cuentaRepository.findOneBy({
      codCuenta,
    });
    if (!cuenta) {
      throw new HttpException('Cuenta no encontrada', HttpStatus.NOT_FOUND);
    }

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
      .where('cuenta.cod_cuenta = :codCuenta', { codCuenta })
      .getRawOne<{ codTenant: number }>();

    verificarTenant(
      tenantResultado?.codTenant,
      datosUsuario,
      'Cuenta no encontrada',
    );

    return cuenta;
  }

  public async consultar(
    codCuenta: number,
    datosUsuario: SesionUsuario,
  ): Promise<Pago[]> {
    await this.verificarCuentaDelTenant(codCuenta, datosUsuario);
    return this.pagoRepository.find({ where: { codCuenta } });
  }

  public async registrar(
    datos: CrearPagoDto,
    datosUsuario: SesionUsuario,
  ): Promise<Pago> {
    // Valida tenant fuera de la transacción (no necesita el lock).
    await this.verificarCuentaDelTenant(datos.codCuenta, datosUsuario);

    const queryRunner = this.poolConexion.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Bloqueo de fila (SELECT ... FOR UPDATE): sin esto, dos pagos casi
      // simultáneos a la misma cuenta podían leer la suma cada uno antes
      // de que el otro confirmara el suyo, y ninguno terminaba marcando
      // la cuenta como PAGADA aunque juntos ya cubrieran el total.
      const cuenta = await queryRunner.manager
        .getRepository(CuentaMensual)
        .createQueryBuilder('cuenta')
        .setLock('pessimistic_write')
        .where('cuenta.cod_cuenta = :codCuenta', {
          codCuenta: datos.codCuenta,
        })
        .getOne();

      if (!cuenta) {
        throw new HttpException('Cuenta no encontrada', HttpStatus.NOT_FOUND);
      }

      const nuevoPago = queryRunner.manager.getRepository(Pago).create({
        ...datos,
        fecha: datos.fecha ? new Date(datos.fecha) : new Date(),
      });
      const pagoGuardado = await queryRunner.manager.save(nuevoPago);

      const sumaRow = await queryRunner.manager
        .getRepository(Pago)
        .createQueryBuilder('pago')
        .select('COALESCE(SUM(pago.monto), 0)', 'sum')
        .where('pago.cod_cuenta = :codCuenta', { codCuenta: datos.codCuenta })
        .getRawOne<{ sum: string }>();
      const sum = sumaRow?.sum ?? '0';

      if (Number(sum) >= Number(cuenta.total)) {
        await queryRunner.manager.update(CuentaMensual, cuenta.codCuenta, {
          estado: EstadoCuenta.PAGADA,
        });
      }

      await queryRunner.commitTransaction();
      return pagoGuardado;
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al registrar el pago',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
