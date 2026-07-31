import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { NormalizarCorreo } from 'src/utilidades/compartido/normalizar-correo.decorator';

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
  @NormalizarCorreo()
  @IsEmail()
  @MaxLength(250)
  correo?: string;

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
