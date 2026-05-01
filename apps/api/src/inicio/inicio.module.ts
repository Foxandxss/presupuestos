import { Module } from '@nestjs/common';

import { ActividadController, InicioController } from './inicio.controller';
import { InicioService } from './inicio.service';

@Module({
  controllers: [InicioController, ActividadController],
  providers: [InicioService],
  exports: [InicioService],
})
export class InicioModule {}
