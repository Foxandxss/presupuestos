import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';

export class CrearConsumoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  lineaPedidoId!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  recursoId!: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  mes!: number;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  anio!: number;

  @ApiProperty({ example: 32, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  horasConsumidas!: number;
}

export class ConsumoFiltrosQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  pedidoId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  lineaPedidoId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  recursoId?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  anio?: number;
}

export class ConsumoDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  lineaPedidoId!: number;

  @ApiProperty()
  pedidoId!: number;

  @ApiProperty()
  recursoId!: number;

  @ApiProperty()
  mes!: number;

  @ApiProperty()
  anio!: number;

  @ApiProperty()
  horasConsumidas!: number;

  @ApiProperty()
  fechaRegistro!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
