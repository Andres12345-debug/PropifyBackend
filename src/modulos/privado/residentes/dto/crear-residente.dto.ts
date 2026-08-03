import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { NormalizarCorreo } from 'src/utilidades/compartido/normalizar-correo.decorator';

// Celular colombiano: siempre 10 dígitos (ver nota en telefono más abajo).
const TELEFONO_REGEX = /^\d{10}$/;
const TELEFONO_REGEX_MESSAGE = 'El teléfono debe tener 10 dígitos';

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

  // "telefono" es siempre el celular del residente (no hay línea fija
  // separada) — de ahí que se valide como celular colombiano de 10 dígitos.
  @IsString()
  @IsNotEmpty()
  @Matches(TELEFONO_REGEX, { message: TELEFONO_REGEX_MESSAGE })
  telefono!: string;

  // Obligatorio: es el canal por el que se envían los recordatorios de pago
  // y avisos de mora (ver CobranzaService.enviarRecordatorios/enviarAvisosMora).
  @IsNotEmpty()
  @NormalizarCorreo()
  @IsEmail()
  @MaxLength(250)
  correo!: string;

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
