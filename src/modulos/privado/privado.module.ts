import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RolesModule } from './roles/roles.module';
import { PropiedadesModule } from './propiedades/propiedades.module';

const routes: Routes = [
  {
    path: 'privado',
    children: [UsuariosModule, RolesModule, PropiedadesModule],
  },
];

@Module({
  imports: [
    RouterModule.register(routes),
    UsuariosModule,
    RolesModule,
    PropiedadesModule,
  ],
  exports: [RouterModule],
})
export class PrivadoModule {}
