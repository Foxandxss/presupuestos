import { Module } from '@nestjs/common';

import { HistorialPedidoService } from './historial-pedido.service';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';
import { ResolutorTarifa } from './resolutor-tarifa';

@Module({
  controllers: [PedidosController],
  providers: [PedidosService, ResolutorTarifa, HistorialPedidoService],
  exports: [PedidosService, ResolutorTarifa, HistorialPedidoService],
})
export class PedidosModule {}
