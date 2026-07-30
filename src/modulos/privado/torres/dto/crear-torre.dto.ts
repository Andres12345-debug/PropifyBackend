import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CrearTorreDto {
  @IsInt()
  codInmueble!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  nombre!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  numeroPisos?: number;
}
