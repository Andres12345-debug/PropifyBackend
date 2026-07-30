import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CrearZonaComunDto {
  @IsInt()
  codInmueble!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  nombre!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacidad?: number;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'horaApertura debe tener formato HH:mm',
  })
  horaApertura?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'horaCierre debe tener formato HH:mm',
  })
  horaCierre?: string;
}
