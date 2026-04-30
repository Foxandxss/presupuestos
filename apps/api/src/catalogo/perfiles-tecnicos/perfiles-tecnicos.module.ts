import { Module } from '@nestjs/common';

import { PerfilesTecnicosController } from './perfiles-tecnicos.controller';
import { PerfilesTecnicosService } from './perfiles-tecnicos.service';

@Module({
  controllers: [PerfilesTecnicosController],
  providers: [PerfilesTecnicosService],
  exports: [PerfilesTecnicosService],
})
export class PerfilesTecnicosModule {}
