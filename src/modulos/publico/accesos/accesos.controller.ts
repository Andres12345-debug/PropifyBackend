import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { AccesosService } from './accesos.service';
import { LoginDto } from './dto/accesoDto';
import { JwtGuard } from 'src/middleware/seguridad/guardianes/jwt.guard';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('auth')
export class AccesosController {
  constructor(private readonly accesosService: AccesosService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('/login')
  public async login(
    @Body() datosLogin: LoginDto,
    @Req() request: Request,
  ): Promise<{ mensaje: string; token: string }> {
    return this.accesosService.login(
      datosLogin,
      request.ip ?? 'unknown',
      request.headers['user-agent'] ?? 'unknown',
    );
  }

  @UseGuards(JwtGuard)
  @Post('/logout')
  public async logout(
    @Req() request: RequestConUsuario,
  ): Promise<{ mensaje: string }> {
    return this.accesosService.logout(request.datosUsuario!);
  }
}
