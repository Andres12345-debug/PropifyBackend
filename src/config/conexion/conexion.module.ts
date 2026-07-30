import { Global, Logger, Module } from '@nestjs/common';
import { Acceso } from 'src/modelos/acceso/acceso';
import { AccessLog } from 'src/modelos/audit/access-log';
import { PasswordResetToken } from 'src/modelos/audit/password-reset-token';
import { RevokedToken } from 'src/modelos/audit/revoked-token';
import { Rol } from 'src/modelos/rol/rol';
import { Usuario } from 'src/modelos/usuario/usuario';
import { Tenant } from 'src/modelos/tenant/tenant';
import { Inmueble } from 'src/modelos/inmueble/inmueble';
import { Torre } from 'src/modelos/torre/torre';
import { Unidad } from 'src/modelos/unidad/unidad';
import { Residente } from 'src/modelos/residente/residente';
import { CuentaMensual } from 'src/modelos/cuenta-mensual/cuenta-mensual';
import { CargoDetalle } from 'src/modelos/cargo-detalle/cargo-detalle';
import { Pago } from 'src/modelos/pago/pago';
import { Gasto } from 'src/modelos/gasto/gasto';
import { ZonaComun } from 'src/modelos/zona-comun/zona-comun';
import { Reserva } from 'src/modelos/reserva/reserva';
import { Parqueadero } from 'src/modelos/parqueadero/parqueadero';
import { Visita } from 'src/modelos/visita/visita';
import { AutorizacionPrevia } from 'src/modelos/autorizacion-previa/autorizacion-previa';
import { Paquete } from 'src/modelos/paquete/paquete';
import { Aviso } from 'src/modelos/aviso/aviso';
import { ReporteDano } from 'src/modelos/reporte-dano/reporte-dano';
import { NotificacionEnviada } from 'src/modelos/notificacion-enviada/notificacion-enviada';
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
              Tenant,
              Inmueble,
              Torre,
              Unidad,
              Residente,
              CuentaMensual,
              CargoDetalle,
              Pago,
              Gasto,
              ZonaComun,
              Reserva,
              Parqueadero,
              Visita,
              AutorizacionPrevia,
              Paquete,
              Aviso,
              ReporteDano,
              NotificacionEnviada,
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
