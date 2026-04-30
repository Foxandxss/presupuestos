import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';

export class CrearLineaPedidoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  perfilTecnicoId!: number;

  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  fechaInicio!: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  fechaFin!: string;

  @ApiProperty({ example: 160, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  horasOfertadas!: number;

  @ApiProperty({
    required: false,
    description:
      'Si no se envía, el backend lo prerellena con la tarifa vigente del Servicio (proveedor del Pedido + perfil de la Línea).',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  precioHora?: number;
}

export class ActualizarLineaPedidoDto extends PartialType(CrearLineaPedidoDto) {}

export class LineaPedidoDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  pedidoId!: number;

  @ApiProperty()
  perfilTecnicoId!: number;

  @ApiProperty()
  fechaInicio!: string;

  @ApiProperty()
  fechaFin!: string;

  @ApiProperty()
  horasOfertadas!: number;

  @ApiProperty()
  precioHora!: number;

  @ApiProperty()
  tarifaCongelada!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
