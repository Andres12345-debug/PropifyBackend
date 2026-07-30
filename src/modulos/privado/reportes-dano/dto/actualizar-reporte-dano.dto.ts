import { IsEnum } from 'class-validator';
import { EstadoReporte } from 'src/modelos/reporte-dano/reporte-dano';

export class ActualizarReporteDanoDto {
  @IsEnum(EstadoReporte)
  estado!: EstadoReporte;
}
