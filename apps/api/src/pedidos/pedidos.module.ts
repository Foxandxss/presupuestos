import { Module } from '@nestjs/common';

import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';
import { ResolutorTarifa } from './resolutor-tarifa';

@Module({
  controllers: [PedidosController],
  providers: [PedidosService, ResolutorTarifa],
  exports: [PedidosService, ResolutorTarifa],
})
export class PedidosModule {}
