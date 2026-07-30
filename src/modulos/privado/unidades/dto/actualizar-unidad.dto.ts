import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TipoUnidad } from 'src/modelos/unidad/unidad';

export class ActualizarUnidadDto {
  @IsOptional()
  @IsInt()
  codTorre?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  identificador?: string;

  @IsOptional()
  @IsInt()
  piso?: number;

  @IsOptional()
  @IsEnum(TipoUnidad)
  tipo?: TipoUnidad;

  @IsOptional()
  @IsNumber()
  @Min(0)
  areaM2?: number;
}
