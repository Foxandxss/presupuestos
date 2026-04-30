import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CatalogoModule } from '../catalogo/catalogo.module';
import { DbModule } from '../db/db.module';
import { HealthController } from './health.controller';

@Module({
  imports: [DbModule, AuthModule, CatalogoModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
