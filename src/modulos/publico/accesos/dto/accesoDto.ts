import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { NormalizarCorreo } from 'src/utilidades/compartido/normalizar-correo.decorator';

export class LoginDto {
  @NormalizarCorreo()
  @IsEmail()
  @IsNotEmpty()
  public correoUsuario!: string;

  @IsString()
  @IsNotEmpty()
  public claveAcceso!: string;
}
