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

import { ESTADOS_PEDIDO, type EstadoPedido } from '../../db/schema';
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
