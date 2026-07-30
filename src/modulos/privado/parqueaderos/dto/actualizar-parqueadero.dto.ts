import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class ActualizarParqueaderoDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  numero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipo?: string;

  @IsOptional()
  @IsInt()
  codUnidad?: number;
}
