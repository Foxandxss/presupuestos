import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

import type { Rol } from '@operaciones/dominio';

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
}

export class ActividadRecursoDto {
  @ApiProperty({ enum: ['pedido', 'consumo', 'proyecto'] })
  tipo!: 'pedido' | 'consumo' | 'proyecto';

  @ApiProperty()
  id!: number;
}

export class ActividadEventoDto {
  @ApiProperty({
    enum: [
      'pedido_creado',
      'pedido_solicitado',
      'pedido_aprobado',
      'pedido_actualizado',
      'consumo_registrado',
    ],
  })
  tipo!:
    | 'pedido_creado'
    | 'pedido_solicitado'
    | 'pedido_aprobado'
    | 'pedido_actualizado'
    | 'consumo_registrado';

  @ApiProperty({ description: 'Fecha ISO del evento' })
  fecha!: string;

  @ApiProperty()
  descripcion!: string;

  @ApiProperty({ type: ActividadRecursoDto })
  recurso!: ActividadRecursoDto;
}
