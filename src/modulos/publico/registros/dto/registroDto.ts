import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsInt,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import {
  PASSWORD_REGEX,
  PASSWORD_REGEX_MESSAGE,
} from 'src/utilidades/compartido/password-policy';
import { NormalizarCorreo } from 'src/utilidades/compartido/normalizar-correo.decorator';

export class RegistroDto {
  // Tenant al que se une (invitación a un conjunto/edificio ya existente).
  // Para crear un tenant nuevo, ver POST /publico/registros/tenant.
  @IsInt()
  codTenant!: number;

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
