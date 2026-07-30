import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PlanTipo } from 'src/modelos/tenant/tenant';

export class ActualizarTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(250)
  nombre?: string;

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

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
