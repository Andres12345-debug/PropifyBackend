import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CrearReporteDanoDto {
  // Requerido cuando lo crea un DUEÑO/ADMIN (a nombre de un residente).
  // Un RESIDENTE lo omite: el servicio usa su propio registro.
  @IsOptional()
  @IsInt()
  codResidente?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  descripcion!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  fotoUrl?: string;
}
