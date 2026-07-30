import { Global, Logger, Module } from '@nestjs/common';
import { Acceso } from 'src/modelos/acceso/acceso';
import { AccessLog } from 'src/modelos/audit/access-log';
import { PasswordResetToken } from 'src/modelos/audit/password-reset-token';
import { RevokedToken } from 'src/modelos/audit/revoked-token';
import { Propiedad } from 'src/modelos/propiedad/propiedad';
import { Rol } from 'src/modelos/rol/rol';
import { Usuario } from 'src/modelos/usuario/usuario';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

const logger = new Logger('ConexionModule');

@Global()
@Module({
  imports: [],
  providers: [
    {
      provide: DataSource,
      inject: [],
      useFactory: async () => {
        try {
          const esProduccion = process.env.NODE_ENV === 'production';
          const poolConexion = new DataSource({
            type: 'postgres',
            host: String(process.env.DB_HOST),
            port: Number(process.env.DB_PORT),
            username: String(process.env.DB_USER),
            password: String(process.env.DB_PASSWORD),
            database: String(process.env.DB_NAME),
            // Solo en desarrollo: en producción usa migraciones, nunca
            // sincronización automática del esquema.
            synchronize: !esProduccion,
            logging: !esProduccion,
            namingStrategy: new SnakeNamingStrategy(),
            entities: [
              Acceso,
              AccessLog,
              PasswordResetToken,
              RevokedToken,
              Usuario,
              Rol,
              Propiedad,
            ],
          });

          await poolConexion.initialize();
          logger.log('Conexión a la base de datos establecida correctamente.');

          return poolConexion;
        } catch (miError) {
          logger.error(
            'Falló al realizar la conexión a la base de datos.',
            miError instanceof Error ? miError.stack : String(miError),
          );
          throw miError;
        }
      },
    },
  ],
  exports: [DataSource],
})
export class ConexionModule {}
