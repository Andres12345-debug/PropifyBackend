import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CrearAvisoDto {
  @IsInt()
  codInmueble!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  titulo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  mensaje!: string;
}
