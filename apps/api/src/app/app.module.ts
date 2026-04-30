import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CatalogoModule } from '../catalogo/catalogo.module';
import { DbModule } from '../db/db.module';
import { ProyectosModule } from '../proyectos/proyectos.module';
import { HealthController } from './health.controller';

@Module({
  imports: [DbModule, AuthModule, CatalogoModule, ProyectosModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
