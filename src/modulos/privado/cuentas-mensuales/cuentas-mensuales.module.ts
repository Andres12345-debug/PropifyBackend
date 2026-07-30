import { Module } from '@nestjs/common';
import { CuentasMensualesService } from './cuentas-mensuales.service';
import { CuentasMensualesController } from './cuentas-mensuales.controller';

@Module({
  providers: [CuentasMensualesService],
  controllers: [CuentasMensualesController],
})
export class CuentasMensualesModule {}
