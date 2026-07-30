import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TipoUnidad } from 'src/modelos/unidad/unidad';

export class CrearUnidadDto {
  @IsInt()
  codInmueble!: number;

  @IsOptional()
  @IsInt()
  codTorre?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  identificador!: string;

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
