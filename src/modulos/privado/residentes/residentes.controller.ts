import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtGuard } from 'src/middleware/seguridad/guardianes/jwt.guard';
import { RolesGuard } from 'src/middleware/seguridad/guardianes/roles.guard';
import { Roles } from 'src/middleware/seguridad/decoradores/roles.decorator';
import { RoleNames } from 'src/middleware/seguridad/rol.helper';
import { ResidentesService } from './residentes.service';
import { CrearResidenteDto } from './dto/crear-residente.dto';
import { ActualizarResidenteDto } from './dto/actualizar-residente.dto';
import { OPCIONES_MULTER_CONTRATO } from './contrato.multer-options';
import type { RequestConUsuario } from 'src/middleware/seguridad/guardianes/auth.interface';

@Controller('residentes')
@UseGuards(JwtGuard, RolesGuard)
export class ResidentesController {
  constructor(private readonly residentesService: ResidentesService) {}

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Get()
  public consultar(
    @Query('unidadId', ParseIntPipe) unidadId: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.residentesService.consultar(unidadId, request.datosUsuario!);
  }

  @Roles(RoleNames.RESIDENTE)
  @Get('me')
  public consultarMe(@Req() request: RequestConUsuario) {
    return this.residentesService.consultarMe(request.datosUsuario!);
  }

  // Debe ir antes de ':id' — si no, Nest interpreta "por-vencer" como el
  // parámetro :id.
  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Get('por-vencer')
  public consultarPorVencer(@Req() request: RequestConUsuario) {
    return this.residentesService.consultarPorVencer(request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Get(':id')
  public consultarUno(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.residentesService.consultarUno(id, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Post()
  public registrar(
    @Body() datos: CrearResidenteDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.residentesService.registrar(datos, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Put(':id')
  public actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: ActualizarResidenteDto,
    @Req() request: RequestConUsuario,
  ) {
    return this.residentesService.actualizar(id, datos, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Delete(':id')
  public eliminar(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.residentesService.eliminar(id, request.datosUsuario!);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Post(':id/contrato')
  @UseInterceptors(FileInterceptor('archivo', OPCIONES_MULTER_CONTRATO))
  public subirContrato(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() archivo: Express.Multer.File,
    @Req() request: RequestConUsuario,
  ) {
    return this.residentesService.subirContrato(
      id,
      archivo,
      request.datosUsuario!,
    );
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Get(':id/contrato')
  public async descargarContrato(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
    @Res() response: Response,
  ): Promise<void> {
    const ruta = await this.residentesService.obtenerRutaContrato(
      id,
      request.datosUsuario!,
    );
    response.download(ruta);
  }

  @Roles(RoleNames.DUENO, RoleNames.ADMIN)
  @Delete(':id/contrato')
  public eliminarContrato(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestConUsuario,
  ) {
    return this.residentesService.eliminarContrato(id, request.datosUsuario!);
  }
}
