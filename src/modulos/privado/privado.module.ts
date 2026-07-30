import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RolesModule } from './roles/roles.module';
import { TenantsModule } from './tenants/tenants.module';
import { InmueblesModule } from './inmuebles/inmuebles.module';
import { TorresModule } from './torres/torres.module';
import { UnidadesModule } from './unidades/unidades.module';
import { ResidentesModule } from './residentes/residentes.module';
import { CuentasMensualesModule } from './cuentas-mensuales/cuentas-mensuales.module';
import { PagosModule } from './pagos/pagos.module';
import { GastosModule } from './gastos/gastos.module';
import { CajaFuerteModule } from './caja-fuerte/caja-fuerte.module';
import { ZonasComunesModule } from './zonas-comunes/zonas-comunes.module';
import { ReservasModule } from './reservas/reservas.module';
import { ParqueaderosModule } from './parqueaderos/parqueaderos.module';
import { PorteriaModule } from './porteria/porteria.module';
import { AvisosModule } from './avisos/avisos.module';
import { ReportesDanoModule } from './reportes-dano/reportes-dano.module';
import { CobranzaModule } from './cobranza/cobranza.module';

const modulosDominio = [
  UsuariosModule,
  RolesModule,
  TenantsModule,
  InmueblesModule,
  TorresModule,
  UnidadesModule,
  ResidentesModule,
  CuentasMensualesModule,
  PagosModule,
  GastosModule,
  CajaFuerteModule,
  ZonasComunesModule,
  ReservasModule,
  ParqueaderosModule,
  PorteriaModule,
  AvisosModule,
  ReportesDanoModule,
  CobranzaModule,
];

const routes: Routes = [
  {
    path: 'privado',
    children: modulosDominio,
  },
];

@Module({
  imports: [RouterModule.register(routes), ...modulosDominio],
  exports: [RouterModule],
})
export class PrivadoModule {}
