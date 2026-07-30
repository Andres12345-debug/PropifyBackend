import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ConexionModule } from './config/conexion/conexion.module';

import { PublicoModule } from './modulos/publico/publico.module';
import { PrivadoModule } from './modulos/privado/privado.module';

import { SeedService } from './utilidades/compartido/seed.service';
import { RolesModule } from './modulos/privado/roles/roles.module';
import { envValidationSchema } from './config/env.validation';
import { SeguridadModule } from './middleware/seguridad/seguridad.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
    }),

    // Límite global por defecto: 100 solicitudes/minuto por IP. Los
    // endpoints públicos sensibles (login, registro, reset de password)
    // tienen un límite más estricto propio vía @Throttle en sus controllers.
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    ScheduleModule.forRoot(),

    ConexionModule,

    SeguridadModule,

    PublicoModule,

    PrivadoModule,

    // Correcto porque SeedService usa RolesService
    RolesModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,
    SeedService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
