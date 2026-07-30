import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CrearParqueaderoDto {
  @IsInt()
  codInmueble!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  numero!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipo?: string;

  @IsOptional()
  @IsInt()
  codUnidad?: number;
}
