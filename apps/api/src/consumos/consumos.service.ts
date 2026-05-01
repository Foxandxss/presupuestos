import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import type { Database } from '../db/db.module';
import { DATABASE } from '../db/db.module';
import {
  consumosMensuales,
  lineasPedido,
  pedidos,
  recursos,
  type ConsumoMensual,
  type EstadoPedido,
} from '../db/schema';
import { MaquinaEstadosPedido } from '../pedidos/maquina-estados-pedido';
import { ConsumoDto, ConsumoFiltrosQuery, CrearConsumoDto } from './dto/consumo.dto';
import {
  ContextoValidacionConsumo,
  ValidadorConsumo,
} from './validador-consumo';

@Injectable()
export class ConsumosService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  list(filtros: ConsumoFiltrosQuery = {}): ConsumoDto[] {
    const condiciones = [];
    if (filtros.lineaPedidoId !== undefined) {
      condiciones.push(eq(consumosMensuales.lineaPedidoId, filtros.lineaPedidoId));
    }
    if (filtros.recursoId !== undefined) {
      condiciones.push(eq(consumosMensuales.recursoId, filtros.recursoId));
    }
    if (filtros.mes !== undefined) {
      condiciones.push(eq(consumosMensuales.mes, filtros.mes));
    }
    if (filtros.anio !== undefined) {
      condiciones.push(eq(consumosMensuales.anio, filtros.anio));
    }

    const filas = this.db
      .select({
        consumo: consumosMensuales,
        pedidoId: lineasPedido.pedidoId,
      })
      .from(consumosMensuales)
      .innerJoin(
        lineasPedido,
        eq(lineasPedido.id, consumosMensuales.lineaPedidoId),
      )
      .where(condiciones.length > 0 ? and(...condiciones) : undefined)
      .all();

    let resultado = filas.map((row) => this.adaptar(row.consumo, row.pedidoId));
    if (filtros.pedidoId !== undefined) {
      resultado = resultado.filter((c) => c.pedidoId === filtros.pedidoId);
    }
    return resultado;
  }

  get(id: number): ConsumoDto {
    const consumo = this.requireConsumo(id);
    const linea = this.lineaDe(consumo.lineaPedidoId);
    return this.adaptar(consumo, linea.pedidoId);
  }

  create(dto: CrearConsumoDto, usuarioId?: number): ConsumoDto {
    const linea = this.lineaOrNull(dto.lineaPedidoId);
    if (!linea) {
      throw new BadRequestException(
        `Línea de pedido ${dto.lineaPedidoId} no existe`,
      );
    }
    const pedido = this.pedidoOrNull(linea.pedidoId);
    if (!pedido) {
      throw new BadRequestException(`Pedido ${linea.pedidoId} no existe`);
    }
    const recurso = this.recursoOrNull(dto.recursoId);
    if (!recurso) {
      throw new BadRequestException(`Recurso ${dto.recursoId} no existe`);
    }

    const horasYaConsumidasLinea = this.sumaHorasLinea(linea.id);
    const duplicado = this.existeConsumo(
      linea.id,
      dto.recursoId,
      dto.mes,
      dto.anio,
    );
    const ctx: ContextoValidacionConsumo = {
      estadoPedido: pedido.estado,
      proveedorIdPedido: pedido.proveedorId,
      proveedorIdRecurso: recurso.proveedorId,
      fechaInicioLinea: linea.fechaInicio,
      fechaFinLinea: linea.fechaFin,
      horasOfertadasLinea: linea.horasOfertadas,
      horasYaConsumidasLinea,
      duplicado,
    };

    ValidadorConsumo.validar(
      { mes: dto.mes, anio: dto.anio, horas: dto.horasConsumidas },
      ctx,
    );

    const [creado] = this.db
      .insert(consumosMensuales)
      .values({
        lineaPedidoId: linea.id,
        recursoId: dto.recursoId,
        usuarioId: usuarioId ?? null,
        mes: dto.mes,
        anio: dto.anio,
        horasConsumidas: dto.horasConsumidas,
      })
      .returning()
      .all();

    this.aplicarAutoTransicion(linea.pedidoId, pedido.estado);

    return this.adaptar(creado, linea.pedidoId);
  }

  delete(id: number): void {
    const consumo = this.requireConsumo(id);
    const linea = this.lineaDe(consumo.lineaPedidoId);
    const pedido = this.pedidoOrNull(linea.pedidoId);
    this.db.delete(consumosMensuales).where(eq(consumosMensuales.id, id)).run();
    if (pedido) {
      this.recalcularEstadoTrasBorrar(linea.pedidoId, pedido.estado);
    }
  }

  private aplicarAutoTransicion(
    pedidoId: number,
    estadoActual: EstadoPedido,
  ): void {
    const lineasParaMaquina = this.lineasConTotales(pedidoId);
    const intermedio =
      estadoActual === 'Aprobado' ? 'EnEjecucion' : estadoActual;
    const siguiente = MaquinaEstadosPedido.completaSiAplica(
      intermedio,
      lineasParaMaquina,
    );

    if (siguiente !== estadoActual) {
      this.actualizarEstado(pedidoId, siguiente);
    }
  }

  private recalcularEstadoTrasBorrar(
    pedidoId: number,
    estadoActual: EstadoPedido,
  ): void {
    if (estadoActual !== 'EnEjecucion' && estadoActual !== 'Consumido') {
      return;
    }
    const lineasParaMaquina = this.lineasConTotales(pedidoId);
    const siguiente = MaquinaEstadosPedido.recalcularTrasBorrar(
      estadoActual,
      lineasParaMaquina,
    );
    if (siguiente !== estadoActual) {
      this.actualizarEstado(pedidoId, siguiente);
    }
  }

  private lineasConTotales(pedidoId: number) {
    const lineas = this.db
      .select({
        id: lineasPedido.id,
        horasOfertadas: lineasPedido.horasOfertadas,
      })
      .from(lineasPedido)
      .where(eq(lineasPedido.pedidoId, pedidoId))
      .all();
    const consumosAgregados = this.db
      .select({
        lineaPedidoId: consumosMensuales.lineaPedidoId,
        total: sql<number>`SUM(${consumosMensuales.horasConsumidas})`.as(
          'total',
        ),
      })
      .from(consumosMensuales)
      .groupBy(consumosMensuales.lineaPedidoId)
      .all();
    const totalPorLinea = new Map<number, number>(
      consumosAgregados.map((row) => [row.lineaPedidoId, Number(row.total)]),
    );
    return lineas.map((l) => ({
      horasOfertadas: l.horasOfertadas,
      horasConsumidas: totalPorLinea.get(l.id) ?? 0,
    }));
  }

  private actualizarEstado(pedidoId: number, estado: EstadoPedido): void {
    this.db
      .update(pedidos)
      .set({ estado, updatedAt: sql`(CURRENT_TIMESTAMP)` })
      .where(eq(pedidos.id, pedidoId))
      .run();
  }

  private sumaHorasLinea(lineaPedidoId: number): number {
    const [row] = this.db
      .select({
        total: sql<number | null>`SUM(${consumosMensuales.horasConsumidas})`,
      })
      .from(consumosMensuales)
      .where(eq(consumosMensuales.lineaPedidoId, lineaPedidoId))
      .all();
    return Number(row?.total ?? 0);
  }

  private existeConsumo(
    lineaPedidoId: number,
    recursoId: number,
    mes: number,
    anio: number,
  ): boolean {
    const [row] = this.db
      .select({ id: consumosMensuales.id })
      .from(consumosMensuales)
      .where(
        and(
          eq(consumosMensuales.lineaPedidoId, lineaPedidoId),
          eq(consumosMensuales.recursoId, recursoId),
          eq(consumosMensuales.mes, mes),
          eq(consumosMensuales.anio, anio),
        ),
      )
      .limit(1)
      .all();
    return Boolean(row);
  }

  private requireConsumo(id: number): ConsumoMensual {
    const [row] = this.db
      .select()
      .from(consumosMensuales)
      .where(eq(consumosMensuales.id, id))
      .limit(1)
      .all();
    if (!row) {
      throw new NotFoundException(`Consumo ${id} no encontrado`);
    }
    return row;
  }

  private lineaOrNull(id: number) {
    const [row] = this.db
      .select()
      .from(lineasPedido)
      .where(eq(lineasPedido.id, id))
      .limit(1)
      .all();
    return row ?? null;
  }

  private lineaDe(id: number) {
    const linea = this.lineaOrNull(id);
    if (!linea) {
      throw new NotFoundException(`Línea de pedido ${id} no encontrada`);
    }
    return linea;
  }

  private pedidoOrNull(id: number) {
    const [row] = this.db
      .select()
      .from(pedidos)
      .where(eq(pedidos.id, id))
      .limit(1)
      .all();
    return row ?? null;
  }

  private recursoOrNull(id: number) {
    const [row] = this.db
      .select()
      .from(recursos)
      .where(eq(recursos.id, id))
      .limit(1)
      .all();
    return row ?? null;
  }

  private adaptar(consumo: ConsumoMensual, pedidoId: number): ConsumoDto {
    return {
      id: consumo.id,
      lineaPedidoId: consumo.lineaPedidoId,
      pedidoId,
      recursoId: consumo.recursoId,
      usuarioId: consumo.usuarioId ?? null,
      mes: consumo.mes,
      anio: consumo.anio,
      horasConsumidas: consumo.horasConsumidas,
      fechaRegistro: consumo.fechaRegistro,
      createdAt: consumo.createdAt,
      updatedAt: consumo.updatedAt,
    };
  }
}
