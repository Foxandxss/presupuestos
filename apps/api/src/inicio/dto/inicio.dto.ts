import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

import type { Rol } from '@operaciones/dominio';

import { TIPOS_ACTIVIDAD, type TipoActividad } from '../agregador-actividad';

export class InicioKpisQuery {
  @ApiProperty({ enum: ['admin', 'consultor'] })
  @IsIn(['admin', 'consultor'])
  rol!: Rol;
}

export class KpisAdminDto {
  @ApiProperty({ description: 'Pedidos en estado Solicitado' })
  pendientesAprobacion!: number;

  @ApiProperty({ description: 'Pedidos en estado EnEjecucion' })
  enEjecucion!: number;

  @ApiProperty({ description: 'Importe facturado del mes en curso (eur)' })
  facturacionMes!: number;

  @ApiProperty({
    description:
      'Delta porcentual respecto al mes anterior. null cuando no hay base de cálculo.',
    nullable: true,
    type: Number,
  })
  facturacionMesDelta!: number | null;

  @ApiProperty({ description: 'Total de horas consumidas en el mes en curso' })
  horasMesConsumidas!: number;
}

export class KpisConsultorDto {
  @ApiProperty({ description: 'Pedidos en estado EnEjecucion' })
  enEjecucion!: number;

  @ApiProperty({ description: 'Total de consumos registrados en el mes' })
  consumosDelMes!: number;

  @ApiProperty({
    description: 'Líneas cuyo fechaFin cae dentro del mes en curso',
  })
  lineasQueCierranEsteMes!: number;

  @ApiProperty({
    description: 'Horas que el usuario actual consumió en el mes en curso',
  })
  misHorasConsumidasMes!: number;
}

export class ActividadQuery {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de evento. Aceptado N veces o como CSV.',
    enum: TIPOS_ACTIVIDAD,
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => normalizarLista(value))
  @IsArray()
  @IsIn(TIPOS_ACTIVIDAD, { each: true })
  tipo?: TipoActividad[];

  @ApiPropertyOptional({
    description: 'Fecha mínima (ISO 8601). Inclusive.',
  })
  @IsOptional()
  @IsISO8601({ strict: false })
  desde?: string;

  @ApiPropertyOptional({
    description: 'Fecha máxima (ISO 8601). Inclusive.',
  })
  @IsOptional()
  @IsISO8601({ strict: false })
  hasta?: string;
}

function normalizarLista(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return value;
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

export class ActividadRecursoDto {
  @ApiProperty({ enum: ['pedido', 'consumo', 'proyecto'] })
  tipo!: 'pedido' | 'consumo' | 'proyecto';

  @ApiProperty()
  id!: number;
}

export class ActividadEventoDto {
  @ApiProperty({ enum: TIPOS_ACTIVIDAD })
  tipo!: TipoActividad;

  @ApiProperty({ description: 'Fecha ISO del evento' })
  fecha!: string;

  @ApiProperty()
  descripcion!: string;

  @ApiProperty({ type: ActividadRecursoDto })
  recurso!: ActividadRecursoDto;
}

export class ActividadPaginaDto {
  @ApiProperty({
    description: 'Total de eventos tras aplicar filtros (sin paginar).',
  })
  total!: number;

  @ApiProperty({ type: [ActividadEventoDto] })
  items!: ActividadEventoDto[];
}
