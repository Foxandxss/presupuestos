import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DbModule } from '../db/db.module';
import { HealthController } from './health.controller';

@Module({
  imports: [DbModule, AuthModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
