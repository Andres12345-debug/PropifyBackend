import { IsDateString, IsInt, IsString, Matches } from 'class-validator';

export class CrearReservaDto {
  @IsInt()
  codZona!: number;

  @IsDateString()
  fecha!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'horaInicio debe tener formato HH:mm',
  })
  horaInicio!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'horaFin debe tener formato HH:mm',
  })
  horaFin!: string;
}
