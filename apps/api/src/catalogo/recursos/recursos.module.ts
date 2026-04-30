import { Module } from '@nestjs/common';

import { RecursosController } from './recursos.controller';
import { RecursosService } from './recursos.service';

@Module({
  controllers: [RecursosController],
  providers: [RecursosService],
  exports: [RecursosService],
})
export class RecursosModule {}
