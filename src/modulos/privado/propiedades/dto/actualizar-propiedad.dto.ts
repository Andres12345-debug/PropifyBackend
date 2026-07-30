import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TipoInmueble, TipoOperacion } from 'src/modelos/propiedad/propiedad';

export class ActualizarPropiedadDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(250)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  direccion?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio?: number;

  @IsOptional()
  @IsEnum(TipoOperacion)
  tipoOperacion?: TipoOperacion;

  @IsOptional()
  @IsEnum(TipoInmueble)
  tipoInmueble?: TipoInmueble;

  @IsOptional()
  @IsNumber()
  @Min(0)
  area?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  habitaciones?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  banos?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
