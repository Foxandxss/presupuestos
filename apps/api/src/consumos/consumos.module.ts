import { Module } from '@nestjs/common';

import { PedidosModule } from '../pedidos/pedidos.module';
import { ConsumosController } from './consumos.controller';
import { ConsumosService } from './consumos.service';

@Module({
  imports: [PedidosModule],
  controllers: [ConsumosController],
  providers: [ConsumosService],
  exports: [ConsumosService],
})
export class ConsumosModule {}
