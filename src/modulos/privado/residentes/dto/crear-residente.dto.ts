import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CrearResidenteDto {
  @IsInt()
  codUnidad!: number;

  @IsOptional()
  @IsInt()
  codUsuario?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  telefono!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  cedula?: string;

  @IsOptional()
  @IsBoolean()
  esPropietario?: boolean;

  @IsNumber()
  @Min(0)
  valorMensual!: number;

  @IsInt()
  @Min(1)
  @Max(31)
  diaPago!: number;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;
}
