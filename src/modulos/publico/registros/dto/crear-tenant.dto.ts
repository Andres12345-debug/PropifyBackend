import {
  IsEmail,
  IsNotEmpty,
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

export class CrearTenantDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(250)
  nombreTenant!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
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
