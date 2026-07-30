import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Inmueble } from 'src/modelos/inmueble/inmueble';
import { Pago } from 'src/modelos/pago/pago';
import { Gasto } from 'src/modelos/gasto/gasto';
import { verificarTenant } from 'src/middleware/seguridad/tenant.helper';
import type { SesionUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Injectable()
export class CajaFuerteService {
  private inmuebleRepository: Repository<Inmueble>;
  private pagoRepository: Repository<Pago>;
  private gastoRepository: Repository<Gasto>;

  constructor(private readonly poolConexion: DataSource) {
    this.inmuebleRepository = poolConexion.getRepository(Inmueble);
    this.pagoRepository = poolConexion.getRepository(Pago);
    this.gastoRepository = poolConexion.getRepository(Gasto);
  }

  public async consultar(
    codInmueble: number,
    periodo: string | undefined,
    datosUsuario: SesionUsuario,
  ): Promise<{ ingresos: number; gastos: number; gananciaNeta: number }> {
    const inmueble = await this.inmuebleRepository.findOneBy({ codInmueble });
    if (!inmueble) {
      throw new HttpException('Inmueble no encontrado', HttpStatus.NOT_FOUND);
    }
    verificarTenant(inmueble.codTenant, datosUsuario, 'Inmueble no encontrado');

    const ingresosQuery = this.pagoRepository
      .createQueryBuilder('pago')
      .innerJoin(
        'cuentas_mensuales',
        'cuenta',
        'cuenta.cod_cuenta = pago.cod_cuenta',
      )
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
      .select('COALESCE(SUM(pago.monto), 0)', 'total')
      .where('unidad.cod_inmueble = :codInmueble', { codInmueble });
    if (periodo) {
      ingresosQuery.andWhere('cuenta.periodo = :periodo', { periodo });
    }
    const ingresosRow = await ingresosQuery.getRawOne<{ total: string }>();
    const ingresos = ingresosRow?.total ?? '0';

    const gastosQuery = this.gastoRepository
      .createQueryBuilder('gasto')
      .select('COALESCE(SUM(gasto.monto), 0)', 'total')
      .where('gasto.cod_inmueble = :codInmueble', { codInmueble });
    if (periodo) {
      gastosQuery.andWhere("to_char(gasto.fecha, 'YYYY-MM') = :periodo", {
        periodo,
      });
    }
    const gastosRow = await gastosQuery.getRawOne<{ total: string }>();
    const gastos = gastosRow?.total ?? '0';

    const ingresosNum = Number(ingresos);
    const gastosNum = Number(gastos);

    return {
      ingresos: ingresosNum,
      gastos: gastosNum,
      gananciaNeta: ingresosNum - gastosNum,
    };
  }
}
