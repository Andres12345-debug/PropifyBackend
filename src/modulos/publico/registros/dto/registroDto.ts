import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsInt,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

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

  @IsEmail()
  @IsNotEmpty()
  correoUsuario!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'La contraseña debe contener al menos una letra minúscula, una mayúscula, un número y un carácter especial',
  })
  claveAcceso!: string;
}
