import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ActualizarTorreDto {
  @IsOptional()
  @IsString()
  @MaxLength(250)
  nombre?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  numeroPisos?: number;
}
