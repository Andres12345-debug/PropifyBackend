import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CrearAutorizacionPreviaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  nombreEsperado!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notas?: string;

  @IsDateString()
  ventanaInicio!: string;

  @IsDateString()
  ventanaFin!: string;
}
