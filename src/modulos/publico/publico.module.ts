import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { AccesosModule } from './accesos/accesos.module';
import { RegistrosModule } from './registros/registros.module';
import { CorreoModule } from './correo/correo.module';

const routes: Routes = [
  {
    path: 'publico',
    children: [AccesosModule, RegistrosModule],
  },
];

@Module({
  imports: [
    RouterModule.register(routes),
    AccesosModule,
    RegistrosModule,
    CorreoModule,
  ],
  exports: [RouterModule],
})
export class PublicoModule {}
