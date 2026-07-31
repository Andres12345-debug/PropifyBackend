import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { NormalizarCorreo } from 'src/utilidades/compartido/normalizar-correo.decorator';

export class ActualizarResidenteDto {
  @IsOptional()
  @IsString()
  @MaxLength(250)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

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

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorMensual?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  diaPago?: number;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
