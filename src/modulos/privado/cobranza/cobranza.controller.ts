import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from 'src/middleware/seguridad/guardianes/jwt.guard';
import { RolesGuard } from 'src/middleware/seguridad/guardianes/roles.guard';
import { Roles } from 'src/middleware/seguridad/decoradores/roles.decorator';
import {
  RoleNames,
  esSuperAdmin,
  obtenerRolUsuario,
  obtenerTenantId,
} from 'src/middleware/seguridad/rol.helper';
import { EstadoCuenta } from 'src/modelos/cuenta-mensual/cuenta-mensual';
import { CobranzaService } from './cobranza.service';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('cobranza')
@UseGuards(JwtGuard, RolesGuard)
export class CobranzaController {
  constructor(private readonly cobranzaService: CobranzaService) {}

  // Ejecuta el mismo ciclo que corre el cron diario — imprescindible para
  // probar el motor de cobranza sin esperar a las 6am ni cambiar la hora
  // del servidor. Un dueño solo puede correrlo para su propio tenant (sin
  // esto, cualquier dueño podía disparar el ciclo de TODA la plataforma);
  // el superadministrador sí puede correrlo para todos.
  @Roles(RoleNames.DUENO)
  @Post('ejecutar')
  public async ejecutar(
    @Req() request: RequestConUsuario,
  ): Promise<{ mensaje: string }> {
    const datosUsuario = request.datosUsuario!;
    const codTenant = esSuperAdmin(obtenerRolUsuario(datosUsuario))
      ? undefined
      : (obtenerTenantId(datosUsuario) ?? undefined);

    await this.cobranzaService.ejecutarCobranzaDiaria(codTenant);
    return { mensaje: 'Ciclo de cobranza ejecutado correctamente' };
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Get('cuentas')
  public consultarCuentas(
    @Req() request: RequestConUsuario,
    @Query('estado') estado?: EstadoCuenta,
    @Query('inmuebleId', new ParseIntPipe({ optional: true }))
    inmuebleId?: number,
  ) {
    return this.cobranzaService.consultarCuentas(
      { estado, inmuebleId },
      request.datosUsuario!,
    );
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Post('cuentas/:id/pagos')
  public registrarPago(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: RegistrarPagoDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.cobranzaService.registrarPago(
      id,
      datos,
      request.datosUsuario!,
    );
  }
}
