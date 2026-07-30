import { IsEmail, IsNotEmpty } from 'class-validator';

export class RecuperarContraseniaDto {
  @IsEmail()
  @IsNotEmpty()
  correoUsuario!: string;
}
