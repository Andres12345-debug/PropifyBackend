import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CrearVisitaDto {
  @IsInt()
  codUnidad!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  nombreVisitante!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  cedulaVisitante?: string;
}
