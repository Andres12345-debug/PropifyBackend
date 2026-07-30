import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CrearRolDto {
  @IsString()
  @IsNotEmpty()
  nombreRol!: string;

  @IsOptional()
  @IsNumber()
  estadoRol?: number;
}
