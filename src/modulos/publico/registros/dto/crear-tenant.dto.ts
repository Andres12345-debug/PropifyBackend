import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PlanTipo } from 'src/modelos/tenant/tenant';
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

  // Categoría del cliente (qué tipo de propiedad va a administrar). No
  // limita nada por sí sola — el control real de qué módulos aplican es
  // por inmueble (ver Inmueble.tieneTorres/tieneZonasComunes/etc). Si no
  // se envía, la entidad Tenant usa su default (CASAS).
  @IsOptional()
  @IsEnum(PlanTipo)
  plan?: PlanTipo;

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
