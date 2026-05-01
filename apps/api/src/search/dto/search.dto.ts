import { ApiProperty } from '@nestjs/swagger';

import { ESTADOS_PEDIDO, type EstadoPedido } from '../../db/schema';

export class PedidoSearchDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ enum: ESTADOS_PEDIDO })
  estado!: EstadoPedido;

  @ApiProperty()
  proyectoId!: number;

  @ApiProperty()
  proyectoNombre!: string;

  @ApiProperty()
  proveedorId!: number;

  @ApiProperty()
  proveedorNombre!: string;
}

export class ProyectoSearchDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  nombre!: string;
}

export class ProveedorSearchDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  nombre!: string;
}

export class SearchResultDto {
  @ApiProperty({ type: [PedidoSearchDto] })
  pedidos!: PedidoSearchDto[];

  @ApiProperty({ type: [ProyectoSearchDto] })
  proyectos!: ProyectoSearchDto[];

  @ApiProperty({ type: [ProveedorSearchDto] })
  proveedores!: ProveedorSearchDto[];
}
