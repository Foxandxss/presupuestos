import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';

import type { Database } from '../db/db.module';
import { DATABASE } from '../db/db.module';
import {
  consumosMensuales,
  estimacionesPerfil,
  lineasPedido,
  pedidos,
  perfilesTecnicos,
  proveedores,
  proyectos,
  recursos,
  type EstadoPedido,
} from '../db/schema';
import {
  CalculadorEstimacionVsConsumo,
  type DesgloseHoras,
} from './calculador-estimacion-vs-consumo';
import {
  CalculadorFacturacionMensual,
  type FilaFacturacion,
} from './calculador-facturacion-mensual';
import {
  DetalleFacturacionDto,
  FilaReporteFacturacionDto,
  FilaReporteHorasDto,
  FilaReportePedidoDto,
  ReporteFacturacionQuery,
  ReporteHorasQuery,
  ReportePedidosQuery,
} from './dto/reportes.dto';

// Estados de pedido que cuentan como "compromiso activo" para los reportes de
// horas/facturación. Rechazado y Cancelado quedan fuera porque ya no
// representan trabajo a entregar.
const ESTADOS_ACTIVOS: ReadonlySet<EstadoPedido> = new Set([
  'Borrador',
  'Solicitado',
  'Aprobado',
  'EnEjecucion',
  'Consumido',
]);

@Injectable()
export class ReportesService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  pedidos(query: ReportePedidosQuery): FilaReportePedidoDto[] {
    const condiciones = [];
    if (query.estado !== undefined) {
      condiciones.push(eq(pedidos.estado, query.estado));
    }
    if (query.proveedorId !== undefined) {
      condiciones.push(eq(pedidos.proveedorId, query.proveedorId));
    }
    if (query.proyectoId !== undefined) {
      condiciones.push(eq(pedidos.proyectoId, query.proyectoId));
    }

    const filas = this.db
      .select({
        pedido: pedidos,
        proyectoNombre: proyectos.nombre,
        proveedorNombre: proveedores.nombre,
      })
      .from(pedidos)
      .innerJoin(proyectos, eq(proyectos.id, pedidos.proyectoId))
      .innerJoin(proveedores, eq(proveedores.id, pedidos.proveedorId))
      .where(condiciones.length > 0 ? and(...condiciones) : undefined)
      .all();

    if (filas.length === 0) return [];

    const pedidoIds = filas.map((f) => f.pedido.id);
    const lineas = this.db
      .select()
      .from(lineasPedido)
      .where(inArray(lineasPedido.pedidoId, pedidoIds))
      .all();

    const lineaIds = lineas.map((l) => l.id);
    const consumosAgregados = lineaIds.length
      ? this.db
          .select({
            lineaPedidoId: consumosMensuales.lineaPedidoId,
            total: sql<number>`SUM(${consumosMensuales.horasConsumidas})`.as(
              'total',
            ),
          })
          .from(consumosMensuales)
          .where(inArray(consumosMensuales.lineaPedidoId, lineaIds))
          .groupBy(consumosMensuales.lineaPedidoId)
          .all()
      : [];
    const consumoPorLinea = new Map<number, number>(
      consumosAgregados.map((c) => [c.lineaPedidoId, Number(c.total ?? 0)]),
    );

    const lineasPorPedido = new Map<number, typeof lineas>();
    for (const l of lineas) {
      const lista = lineasPorPedido.get(l.pedidoId) ?? [];
      lista.push(l);
      lineasPorPedido.set(l.pedidoId, lista);
    }

    return filas
      .map((f) => {
        const ls = lineasPorPedido.get(f.pedido.id) ?? [];
        let totalHorasOfertadas = 0;
        let totalHorasConsumidas = 0;
        let importeTotal = 0;
        for (const l of ls) {
          totalHorasOfertadas += l.horasOfertadas;
          const consumido = consumoPorLinea.get(l.id) ?? 0;
          totalHorasConsumidas += consumido;
          importeTotal += consumido * l.precioHora;
        }
        return {
          id: f.pedido.id,
          proyectoId: f.pedido.proyectoId,
          proyectoNombre: f.proyectoNombre,
          proveedorId: f.pedido.proveedorId,
          proveedorNombre: f.proveedorNombre,
          estado: f.pedido.estado,
          fechaSolicitud: f.pedido.fechaSolicitud ?? null,
          fechaAprobacion: f.pedido.fechaAprobacion ?? null,
          totalLineas: ls.length,
          totalHorasOfertadas: redondear(totalHorasOfertadas),
          totalHorasConsumidas: redondear(totalHorasConsumidas),
          importeTotal: redondear(importeTotal),
        };
      })
      .sort((a, b) => a.id - b.id);
  }

  horas(query: ReporteHorasQuery): FilaReporteHorasDto[] {
    const desglose: DesgloseHoras = query.desglose ?? 'proyecto-perfil';

    // Catálogos para enriquecer las filas con nombres legibles.
    const proyectosMap = new Map(
      this.db.select().from(proyectos).all().map((p) => [p.id, p.nombre]),
    );
    const perfilesMap = new Map(
      this.db
        .select()
        .from(perfilesTecnicos)
        .all()
        .map((p) => [p.id, p.nombre]),
    );
    const proveedoresMap = new Map(
      this.db.select().from(proveedores).all().map((p) => [p.id, p.nombre]),
    );

    const estimacionesData = this.db
      .select({
        proyectoId: estimacionesPerfil.proyectoId,
        perfilTecnicoId: estimacionesPerfil.perfilTecnicoId,
        horasEstimadas: estimacionesPerfil.horasEstimadas,
      })
      .from(estimacionesPerfil)
      .all();

    const lineasData = this.db
      .select({
        proyectoId: pedidos.proyectoId,
        proveedorId: pedidos.proveedorId,
        perfilTecnicoId: lineasPedido.perfilTecnicoId,
        horasOfertadas: lineasPedido.horasOfertadas,
        estado: pedidos.estado,
      })
      .from(lineasPedido)
      .innerJoin(pedidos, eq(pedidos.id, lineasPedido.pedidoId))
      .all()
      .filter((l) => ESTADOS_ACTIVOS.has(l.estado));

    const consumosData = this.db
      .select({
        proyectoId: pedidos.proyectoId,
        proveedorId: pedidos.proveedorId,
        perfilTecnicoId: lineasPedido.perfilTecnicoId,
        horasConsumidas: consumosMensuales.horasConsumidas,
      })
      .from(consumosMensuales)
      .innerJoin(
        lineasPedido,
        eq(lineasPedido.id, consumosMensuales.lineaPedidoId),
      )
      .innerJoin(pedidos, eq(pedidos.id, lineasPedido.pedidoId))
      .all();

    const filas = CalculadorEstimacionVsConsumo.calcular({
      estimaciones: estimacionesData,
      lineas: lineasData.map((l) => ({
        proyectoId: l.proyectoId,
        proveedorId: l.proveedorId,
        perfilTecnicoId: l.perfilTecnicoId,
        horasOfertadas: l.horasOfertadas,
      })),
      consumos: consumosData,
      desglose,
      filtros: {
        proyectoId: query.proyectoId,
        proveedorId: query.proveedorId,
        perfilTecnicoId: query.perfilTecnicoId,
      },
    });

    return filas.map((f) => ({
      ...f,
      proyectoNombre:
        f.proyectoId !== null ? proyectosMap.get(f.proyectoId) ?? null : null,
      perfilTecnicoNombre:
        f.perfilTecnicoId !== null
          ? perfilesMap.get(f.perfilTecnicoId) ?? null
          : null,
      proveedorNombre:
        f.proveedorId !== null
          ? proveedoresMap.get(f.proveedorId) ?? null
          : null,
    }));
  }

  facturacion(query: ReporteFacturacionQuery): FilaReporteFacturacionDto[] {
    const datos = this.db
      .select({
        mes: consumosMensuales.mes,
        anio: consumosMensuales.anio,
        horasConsumidas: consumosMensuales.horasConsumidas,
        recursoId: consumosMensuales.recursoId,
        recursoNombre: recursos.nombre,
        lineaPedidoId: lineasPedido.id,
        precioHora: lineasPedido.precioHora,
        perfilTecnicoId: lineasPedido.perfilTecnicoId,
        perfilTecnicoNombre: perfilesTecnicos.nombre,
        pedidoId: pedidos.id,
        proyectoId: pedidos.proyectoId,
        proyectoNombre: proyectos.nombre,
        proveedorId: pedidos.proveedorId,
        proveedorNombre: proveedores.nombre,
        estadoPedido: pedidos.estado,
      })
      .from(consumosMensuales)
      .innerJoin(
        lineasPedido,
        eq(lineasPedido.id, consumosMensuales.lineaPedidoId),
      )
      .innerJoin(pedidos, eq(pedidos.id, lineasPedido.pedidoId))
      .innerJoin(proyectos, eq(proyectos.id, pedidos.proyectoId))
      .innerJoin(proveedores, eq(proveedores.id, pedidos.proveedorId))
      .innerJoin(
        perfilesTecnicos,
        eq(perfilesTecnicos.id, lineasPedido.perfilTecnicoId),
      )
      .innerJoin(recursos, eq(recursos.id, consumosMensuales.recursoId))
      .where(ne(pedidos.estado, 'Cancelado'))
      .all();

    const enriquecidos = new Map<
      string,
      {
        proyectoNombre: string;
        proveedorNombre: string;
        perfilTecnicoNombre: string;
        recursoNombre: string;
        pedidoId: number;
      }
    >();
    for (const d of datos) {
      enriquecidos.set(`${d.lineaPedidoId}|${d.recursoId}|${d.mes}|${d.anio}`, {
        proyectoNombre: d.proyectoNombre,
        proveedorNombre: d.proveedorNombre,
        perfilTecnicoNombre: d.perfilTecnicoNombre,
        recursoNombre: d.recursoNombre,
        pedidoId: d.pedidoId,
      });
    }

    const filas = CalculadorFacturacionMensual.calcular(
      datos.map((d) => ({
        mes: d.mes,
        anio: d.anio,
        proveedorId: d.proveedorId,
        proyectoId: d.proyectoId,
        lineaPedidoId: d.lineaPedidoId,
        recursoId: d.recursoId,
        perfilTecnicoId: d.perfilTecnicoId,
        horasConsumidas: d.horasConsumidas,
        precioHora: d.precioHora,
      })),
      filtrosFacturacionDe(query),
    );

    return filas.map((f) => this.enriquecerFacturacion(f, datos));
  }

  private enriquecerFacturacion(
    fila: FilaFacturacion,
    datos: ReadonlyArray<{
      mes: number;
      anio: number;
      lineaPedidoId: number;
      recursoId: number;
      pedidoId: number;
      proyectoId: number;
      proyectoNombre: string;
      proveedorId: number;
      proveedorNombre: string;
      perfilTecnicoNombre: string;
      recursoNombre: string;
    }>,
  ): FilaReporteFacturacionDto {
    const proveedorNombre =
      datos.find((d) => d.proveedorId === fila.proveedorId)?.proveedorNombre ??
      '';
    const detalle: DetalleFacturacionDto[] = fila.detalle.map((d) => {
      const meta = datos.find(
        (x) =>
          x.lineaPedidoId === d.lineaPedidoId &&
          x.recursoId === d.recursoId &&
          x.mes === fila.mes &&
          x.anio === fila.anio,
      );
      return {
        proyectoId: d.proyectoId,
        proyectoNombre: meta?.proyectoNombre ?? '',
        lineaPedidoId: d.lineaPedidoId,
        pedidoId: meta?.pedidoId ?? 0,
        perfilTecnicoId: d.perfilTecnicoId,
        perfilTecnicoNombre: meta?.perfilTecnicoNombre ?? '',
        recursoId: d.recursoId,
        recursoNombre: meta?.recursoNombre ?? '',
        horasConsumidas: d.horasConsumidas,
        precioHora: d.precioHora,
        importe: d.importe,
      };
    });
    return {
      mes: fila.mes,
      anio: fila.anio,
      proveedorId: fila.proveedorId,
      proveedorNombre,
      totalEur: fila.totalEur,
      detalle,
    };
  }
}

function filtrosFacturacionDe(query: ReporteFacturacionQuery) {
  const filtros: Parameters<typeof CalculadorFacturacionMensual.calcular>[1] =
    {};
  if (query.mesDesde !== undefined && query.anioDesde !== undefined) {
    filtros.mesDesde = { mes: query.mesDesde, anio: query.anioDesde };
  }
  if (query.mesHasta !== undefined && query.anioHasta !== undefined) {
    filtros.mesHasta = { mes: query.mesHasta, anio: query.anioHasta };
  }
  if (query.anio !== undefined) filtros.anio = query.anio;
  if (query.proveedorId !== undefined) filtros.proveedorId = query.proveedorId;
  if (query.proyectoId !== undefined) filtros.proyectoId = query.proyectoId;
  return filtros;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}
