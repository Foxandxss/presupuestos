import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AuthModule } from '../auth/auth.module';
import { CatalogoModule } from '../catalogo/catalogo.module';
import { FormateadorErrores } from '../common/error-filter';
import { ConsumosModule } from '../consumos/consumos.module';
import { DbModule } from '../db/db.module';
import { PedidosModule } from '../pedidos/pedidos.module';
import { ProyectosModule } from '../proyectos/proyectos.module';
import { ReportesModule } from '../reportes/reportes.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    DbModule,
    AuthModule,
    CatalogoModule,
    ProyectosModule,
    PedidosModule,
    ConsumosModule,
    ReportesModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: FormateadorErrores }],
})
export class AppModule {}
