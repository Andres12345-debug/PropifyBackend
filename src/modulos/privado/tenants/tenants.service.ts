import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Tenant } from 'src/modelos/tenant/tenant';
import { CrearTenantDto } from './dto/crear-tenant.dto';
import { ActualizarTenantDto } from './dto/actualizar-tenant.dto';

// Exclusivo del superadministrador (ver tenants.controller.ts): gestión
// directa de los tenants de la plataforma, sin el flujo de autoservicio
// que usa POST /publico/registros/tenant (ese crea también el dueño).
@Injectable()
export class TenantsService {
  private tenantRepository: Repository<Tenant>;

  constructor(private readonly poolConexion: DataSource) {
    this.tenantRepository = poolConexion.getRepository(Tenant);
  }

  public async consultar(): Promise<Tenant[]> {
    return this.tenantRepository.find({ order: { codTenant: 'ASC' } });
  }

  public async consultarUno(id: number): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOneBy({ codTenant: id });
    if (!tenant) {
      throw new HttpException('Tenant no encontrado', HttpStatus.NOT_FOUND);
    }
    return tenant;
  }

  public async registrar(datos: CrearTenantDto): Promise<Tenant> {
    const nuevoTenant = this.tenantRepository.create(datos);
    return this.tenantRepository.save(nuevoTenant);
  }

  public async actualizar(
    id: number,
    datos: ActualizarTenantDto,
  ): Promise<{ mensaje: string }> {
    await this.consultarUno(id);

    await this.tenantRepository.update(id, datos);

    return { mensaje: 'Tenant actualizado correctamente' };
  }

  public async eliminar(id: number): Promise<{ mensaje: string }> {
    await this.consultarUno(id);

    await this.tenantRepository.delete(id);

    return { mensaje: 'Tenant eliminado correctamente' };
  }
}
