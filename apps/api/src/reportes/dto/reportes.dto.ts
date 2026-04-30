import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';

import { ESTADOS_PEDIDO, type EstadoPedido } from '../../db/schema';
import {
  DESGLOSES_HORAS,
  type DesgloseHoras,
} from '../calculador-estimacion-vs-consumo';

export const FORMATOS_REPORTE = ['json', 'csv'] as const;
export type FormatoReporte = (typeof FORMATOS_REPORTE)[number];

export class ReportePedidosQuery {
  @ApiPropertyOptional({ enum: ESTADOS_PEDIDO })
  @IsOptional()
  @IsEnum(ESTADOS_PEDIDO)
  estado?: EstadoPedido;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  proveedorId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  proyectoId?: number;

  @ApiPropertyOptional({ enum: FORMATOS_REPORTE })
  @IsOptional()
  @IsIn(FORMATOS_REPORTE as unknown as string[])
  formato?: FormatoReporte;
}

export class ReporteHorasQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  proyectoId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  proveedorId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  perfilTecnicoId?: number;

  @ApiPropertyOptional({ enum: DESGLOSES_HORAS })
  @IsOptional()
  @IsIn(DESGLOSES_HORAS as unknown as string[])
  desglose?: DesgloseHoras;

  @ApiPropertyOptional({ enum: FORMATOS_REPORTE })
  @IsOptional()
  @IsIn(FORMATOS_REPORTE as unknown as string[])
  formato?: FormatoReporte;
}

export class ReporteFacturacionQuery {
  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mesDesde?: number;

  @ApiPropertyOptional({ minimum: 2000, maximum: 2100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  anioDesde?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mesHasta?: number;

  @ApiPropertyOptional({ minimum: 2000, maximum: 2100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  anioHasta?: number;

  @ApiPropertyOptional({ minimum: 2000, maximum: 2100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  anio?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  proveedorId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  proyectoId?: number;

  @ApiPropertyOptional({ enum: FORMATOS_REPORTE })
  @IsOptional()
  @IsIn(FORMATOS_REPORTE as unknown as string[])
  formato?: FormatoReporte;
}

export class FilaReportePedidoDto {
  @ApiProperty()
  id!: number;
  @ApiProperty()
  proyectoId!: number;
  @ApiProperty()
  proyectoNombre!: string;
  @ApiProperty()
  proveedorId!: number;
  @ApiProperty()
  proveedorNombre!: string;
  @ApiProperty({ enum: ESTADOS_PEDIDO })
  estado!: EstadoPedido;
  @ApiProperty({ nullable: true })
  fechaSolicitud!: string | null;
  @ApiProperty({ nullable: true })
  fechaAprobacion!: string | null;
  @ApiProperty()
  totalLineas!: number;
  @ApiProperty()
  totalHorasOfertadas!: number;
  @ApiProperty()
  totalHorasConsumidas!: number;
  @ApiProperty()
  importeTotal!: number;
}

export class FilaReporteHorasDto {
  @ApiProperty({ nullable: true })
  proyectoId!: number | null;
  @ApiProperty({ nullable: true })
  proyectoNombre!: string | null;
  @ApiProperty({ nullable: true })
  perfilTecnicoId!: number | null;
  @ApiProperty({ nullable: true })
  perfilTecnicoNombre!: string | null;
  @ApiProperty({ nullable: true })
  proveedorId!: number | null;
  @ApiProperty({ nullable: true })
  proveedorNombre!: string | null;
  @ApiProperty()
  horasEstimadas!: number;
  @ApiProperty()
  horasOfertadas!: number;
  @ApiProperty()
  horasConsumidas!: number;
  @ApiProperty()
  horasPendientes!: number;
}

export class DetalleFacturacionDto {
  @ApiProperty()
  proyectoId!: number;
  @ApiProperty()
  proyectoNombre!: string;
  @ApiProperty()
  lineaPedidoId!: number;
  @ApiProperty()
  pedidoId!: number;
  @ApiProperty()
  perfilTecnicoId!: number;
  @ApiProperty()
  perfilTecnicoNombre!: string;
  @ApiProperty()
  recursoId!: number;
  @ApiProperty()
  recursoNombre!: string;
  @ApiProperty()
  horasConsumidas!: number;
  @ApiProperty()
  precioHora!: number;
  @ApiProperty()
  importe!: number;
}

export class FilaReporteFacturacionDto {
  @ApiProperty()
  mes!: number;
  @ApiProperty()
  anio!: number;
  @ApiProperty()
  proveedorId!: number;
  @ApiProperty()
  proveedorNombre!: string;
  @ApiProperty()
  totalEur!: number;
  @ApiProperty({ type: [DetalleFacturacionDto] })
  detalle!: DetalleFacturacionDto[];
}
