import { IsEmail, IsNotEmpty } from 'class-validator';
import { NormalizarCorreo } from 'src/utilidades/compartido/normalizar-correo.decorator';

export class RecuperarContraseniaDto {
  @NormalizarCorreo()
  @IsEmail()
  @IsNotEmpty()
  correoUsuario!: string;
}
