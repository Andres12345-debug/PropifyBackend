import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_REGEX,
  PASSWORD_REGEX_MESSAGE,
} from 'src/utilidades/compartido/password-policy';
import { NormalizarCorreo } from 'src/utilidades/compartido/normalizar-correo.decorator';

export class CrearUsuarioDto {
  @IsNumber()
  codRol!: number;

  // Solo la usa el superadministrador: para cualquier otro actor el tenant
  // siempre es el suyo propio y este campo se ignora (el tenant nunca debe
  // venir del cliente para un rol atado a un tenant).
  @IsOptional()
  @IsNumber()
  codTenant?: number;

  @IsString()
  @IsNotEmpty()
  nombreUsuario!: string;

  @NormalizarCorreo()
  @IsEmail()
  @IsNotEmpty()
  correoUsuario!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REGEX_MESSAGE })
  claveAcceso!: string;
}
