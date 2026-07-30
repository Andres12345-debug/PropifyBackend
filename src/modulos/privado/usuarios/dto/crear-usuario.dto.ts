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
