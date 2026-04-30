import { Module } from '@nestjs/common';

import { ConsumosController } from './consumos.controller';
import { ConsumosService } from './consumos.service';

@Module({
  controllers: [ConsumosController],
  providers: [ConsumosService],
  exports: [ConsumosService],
})
export class ConsumosModule {}
