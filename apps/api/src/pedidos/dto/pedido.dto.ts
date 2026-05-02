import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  ValidateNested,
} from 'class-validator';

import {
  ACCIONES_HISTORIAL_PEDIDO,
  ESTADOS_PEDIDO,
  type AccionHistorialPedido,
  type EstadoPedido,
} from '../../db/schema';
import {
  CrearLineaPedidoDto,
  LineaPedidoDto,
} from './linea-pedido.dto';

export class CrearPedidoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  proyectoId!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  proveedorId!: number;

  @ApiProperty({ type: [CrearLineaPedidoDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrearLineaPedidoDto)
  lineas?: CrearLineaPedidoDto[];
}

export class ActualizarPedidoDto extends PartialType(CrearPedidoDto) {}

export class HistorialPedidoDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ enum: ESTADOS_PEDIDO })
  estadoAnterior!: EstadoPedido;

  @ApiProperty({ enum: ESTADOS_PEDIDO })
  estadoNuevo!: EstadoPedido;

  @ApiProperty({ enum: ACCIONES_HISTORIAL_PEDIDO })
  accion!: AccionHistorialPedido;

  @ApiProperty({ nullable: true })
  usuarioId!: number | null;

  @ApiProperty()
  fecha!: string;

  @ApiProperty({
    description:
      'true cuando la fila se reconstruyó best-effort a partir de fechaSolicitud / fechaAprobacion / updatedAt (migración 0008 sobre pedidos pre-#16, o seed sintético).',
  })
  reconstruido!: boolean;
}

export class PedidoDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  proyectoId!: number;

  @ApiProperty()
  proveedorId!: number;

  @ApiProperty({ enum: ESTADOS_PEDIDO })
  estado!: EstadoPedido;

  @ApiProperty({ nullable: true })
  fechaSolicitud!: string | null;

  @ApiProperty({ nullable: true })
  fechaAprobacion!: string | null;

  @ApiProperty({ type: [LineaPedidoDto] })
  lineas!: LineaPedidoDto[];

  @ApiProperty({ type: [HistorialPedidoDto] })
  historial!: HistorialPedidoDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class TransicionPedidoDto {
  @ApiProperty({ enum: ['solicitar', 'aprobar', 'rechazar', 'cancelar'] })
  @IsEnum(['solicitar', 'aprobar', 'rechazar', 'cancelar'])
  accion!: 'solicitar' | 'aprobar' | 'rechazar' | 'cancelar';
}
