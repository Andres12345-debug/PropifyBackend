import { Body, Controller, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { RegistrosService } from './registros.service';

import { RegistroDto } from './dto/registroDto';
import { CrearTenantDto } from './dto/crear-tenant.dto';
import { RecuperarContraseniaDto } from './dto/recuperar-contrasenia.dto';
import { NuevaContraseniaDto } from './dto/nueva-contrasenia';
import { CambioPasswordDto } from './dto/cambio-password.dto';
import { JwtGuard } from 'src/middleware/seguridad/guardianes/jwt.guard';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('registros')
export class RegistrosController {
  constructor(private readonly registroService: RegistrosService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('/user')
  public async registrarUsuario(
    @Body() datosRegistro: RegistroDto,
    @Req() request: Request,
  ): Promise<{ token: string }> {
    return this.registroService.nuevoUsuario(
      datosRegistro,
      request.ip ?? 'unknown',
      request.headers['user-agent'] ?? 'unknown',
    );
  }

  // Alta de un tenant nuevo (nuevo cliente de Propify): crea el Tenant y su
  // usuario DUEÑO en una sola transacción.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('/tenant')
  public async registrarTenant(
    @Body() datos: CrearTenantDto,
    @Req() request: Request,
  ): Promise<{ token: string }> {
    return this.registroService.nuevoTenant(
      datos,
      request.ip ?? 'unknown',
      request.headers['user-agent'] ?? 'unknown',
    );
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('/recuperar-password')
  public async recuperarPassword(
    @Body() datos: RecuperarContraseniaDto,
    @Req() request: Request,
  ): Promise<{ mensaje: string }> {
    return this.registroService.recuperarContrasenia(
      datos,
      request.ip ?? 'unknown',
      request.headers['user-agent'] ?? 'unknown',
    );
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Patch('/nueva-password')
  public async nuevaPassword(
    @Body() datos: NuevaContraseniaDto,
    @Req() request: Request,
  ): Promise<{ mensaje: string }> {
    return this.registroService.cambiarContrasenia(
      datos.token,
      datos,
      request.ip ?? 'unknown',
      request.headers['user-agent'] ?? 'unknown',
    );
  }

  @UseGuards(JwtGuard)
  @Patch('/cambiar-password')
  public async cambiarPassword(
    @Body() datos: CambioPasswordDto,
    @Req() request: RequestConUsuario,
  ): Promise<{ mensaje: string }> {
    return this.registroService.cambiarPasswordLogueado(
      datos,
      request.datosUsuario!,
      request.ip ?? 'unknown',
      request.headers['user-agent'] ?? 'unknown',
    );
  }
}
