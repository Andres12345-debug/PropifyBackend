import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CrearInmuebleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  direccion?: string;

  @IsOptional()
  @IsBoolean()
  tieneTorres?: boolean;

  @IsOptional()
  @IsBoolean()
  tieneZonasComunes?: boolean;

  @IsOptional()
  @IsBoolean()
  tieneParqueaderos?: boolean;

  @IsOptional()
  @IsBoolean()
  tieneCelador?: boolean;

  @IsOptional()
  @IsBoolean()
  tieneCartelera?: boolean;
}
