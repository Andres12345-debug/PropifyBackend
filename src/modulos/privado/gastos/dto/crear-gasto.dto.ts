import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CrearGastoDto {
  @IsInt()
  codInmueble!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  concepto!: string;

  @IsNumber()
  @Min(0)
  monto!: number;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  categoria?: string;
}
