import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PlanTipo } from 'src/modelos/tenant/tenant';

export class CrearTenantDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(250)
  nombre!: string;

  @IsOptional()
  @IsEnum(PlanTipo)
  plan?: PlanTipo;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  colorPrimario?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  colorSecundario?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
