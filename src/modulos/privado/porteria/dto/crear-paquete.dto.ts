import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearPaqueteDto {
  @IsInt()
  codUnidad!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}
