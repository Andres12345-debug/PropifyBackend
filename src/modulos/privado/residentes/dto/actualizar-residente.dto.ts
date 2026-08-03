import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { NormalizarCorreo } from 'src/utilidades/compartido/normalizar-correo.decorator';

const TELEFONO_REGEX = /^\d{10}$/;
const TELEFONO_REGEX_MESSAGE = 'El teléfono debe tener 10 dígitos';

export class ActualizarResidenteDto {
  @IsOptional()
  @IsString()
  @MaxLength(250)
  nombre?: string;

  @IsOptional()
  @IsString()
  @Matches(TELEFONO_REGEX, { message: TELEFONO_REGEX_MESSAGE })
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
