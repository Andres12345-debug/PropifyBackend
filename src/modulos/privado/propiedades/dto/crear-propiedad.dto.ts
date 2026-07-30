import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TipoInmueble, TipoOperacion } from 'src/modelos/propiedad/propiedad';

export class CrearPropiedadDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(250)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descripcion?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  direccion!: string;

  @IsNumber()
  @Min(0)
  precio!: number;

  @IsEnum(TipoOperacion)
  tipoOperacion!: TipoOperacion;

  @IsEnum(TipoInmueble)
  tipoInmueble!: TipoInmueble;

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
}
