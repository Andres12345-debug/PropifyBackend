import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class RegistrarPagoDto {
  @IsNumber()
  @Min(0.01)
  monto!: number;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  metodo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  referencia?: string;
}
