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
    const cuenta = await this.verificarCuentaDelTenant(
      datos.codCuenta,
      datosUsuario,
    );

    const nuevoPago = this.pagoRepository.create({
      ...datos,
      fecha: datos.fecha ? new Date(datos.fecha) : new Date(),
    });
    const pagoGuardado = await this.pagoRepository.save(nuevoPago);

    const sumaRow = await this.pagoRepository
      .createQueryBuilder('pago')
      .select('COALESCE(SUM(pago.monto), 0)', 'sum')
      .where('pago.cod_cuenta = :codCuenta', { codCuenta: datos.codCuenta })
      .getRawOne<{ sum: string }>();
    const sum = sumaRow?.sum ?? '0';

    if (Number(sum) >= Number(cuenta.total)) {
      await this.cuentaRepository.update(cuenta.codCuenta, {
        estado: EstadoCuenta.PAGADA,
      });
    }

    return pagoGuardado;
  }
}
