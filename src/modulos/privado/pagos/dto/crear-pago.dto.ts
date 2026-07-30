import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CrearPagoDto {
  @IsInt()
  codCuenta!: number;

  @IsNumber()
  @Min(0.01)
  monto!: number;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  metodo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  referencia?: string;
}
