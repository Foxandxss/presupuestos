// Deep module: a partir de un dataset de pedidos + consumos + líneas calcula
// los 4 KPIs de la pantalla de Inicio para cada rol. Es un calculador puro
// que recibe arrays ya hidratados; el servicio se encarga del fetch.

import type { EstadoPedido } from '../db/schema';

export interface PedidoParaKpis {
  id: number;
  estado: EstadoPedido;
}

export interface LineaParaKpis {
  id: number;
  pedidoId: number;
  horasOfertadas: number;
  precioHora: number;
  fechaFin: string;
}

export interface ConsumoParaKpis {
  lineaPedidoId: number;
  usuarioId: number | null;
  mes: number;
  anio: number;
  horasConsumidas: number;
}

export interface ContextoMes {
  mesActual: number;
  anioActual: number;
}

export interface KpisAdmin {
  pendientesAprobacion: number;
  enEjecucion: number;
  facturacionMes: number;
  facturacionMesDelta: number | null;
  horasMesConsumidas: number;
}

export interface KpisConsultor {
  enEjecucion: number;
  consumosDelMes: number;
  lineasQueCierranEsteMes: number;
  misHorasConsumidasMes: number;
}

export const CalculadorKpisInicio = {
  admin(
    pedidos: PedidoParaKpis[],
    lineas: LineaParaKpis[],
    consumos: ConsumoParaKpis[],
    ctx: ContextoMes,
  ): KpisAdmin {
    const pendientesAprobacion = pedidos.filter(
      (p) => p.estado === 'Solicitado',
    ).length;
    const enEjecucion = pedidos.filter((p) => p.estado === 'EnEjecucion').length;

    const precioPorLinea = new Map<number, number>(
      lineas.map((l) => [l.id, l.precioHora]),
    );

    const consumosMes = consumos.filter(
      (c) => c.mes === ctx.mesActual && c.anio === ctx.anioActual,
    );
    const consumosMesAnterior = consumos.filter((c) =>
      esMesAnterior(c, ctx),
    );

    const facturacionMes = round(
      consumosMes.reduce((acc, c) => {
        const precio = precioPorLinea.get(c.lineaPedidoId) ?? 0;
        return acc + c.horasConsumidas * precio;
      }, 0),
    );
    const facturacionAnterior = round(
      consumosMesAnterior.reduce((acc, c) => {
        const precio = precioPorLinea.get(c.lineaPedidoId) ?? 0;
        return acc + c.horasConsumidas * precio;
      }, 0),
    );

    const horasMesConsumidas = round(
      consumosMes.reduce((acc, c) => acc + c.horasConsumidas, 0),
    );

    const facturacionMesDelta =
      facturacionAnterior > 0
        ? round(
            ((facturacionMes - facturacionAnterior) / facturacionAnterior) * 100,
          )
        : null;

    return {
      pendientesAprobacion,
      enEjecucion,
      facturacionMes,
      facturacionMesDelta,
      horasMesConsumidas,
    };
  },

  consultor(
    pedidos: PedidoParaKpis[],
    lineas: LineaParaKpis[],
    consumos: ConsumoParaKpis[],
    ctx: ContextoMes,
    usuarioId: number,
  ): KpisConsultor {
    const enEjecucion = pedidos.filter((p) => p.estado === 'EnEjecucion').length;

    const consumosMes = consumos.filter(
      (c) => c.mes === ctx.mesActual && c.anio === ctx.anioActual,
    );
    const consumosDelMes = consumosMes.length;

    const lineasQueCierranEsteMes = lineas.filter((l) =>
      cierraEnMes(l.fechaFin, ctx),
    ).length;

    const misHorasConsumidasMes = round(
      consumosMes
        .filter((c) => c.usuarioId === usuarioId)
        .reduce((acc, c) => acc + c.horasConsumidas, 0),
    );

    return {
      enEjecucion,
      consumosDelMes,
      lineasQueCierranEsteMes,
      misHorasConsumidasMes,
    };
  },
};

function esMesAnterior(c: ConsumoParaKpis, ctx: ContextoMes): boolean {
  const idxConsumo = c.anio * 12 + (c.mes - 1);
  const idxActual = ctx.anioActual * 12 + (ctx.mesActual - 1);
  return idxConsumo === idxActual - 1;
}

function cierraEnMes(fecha: string, ctx: ContextoMes): boolean {
  const [anio, mes] = fecha.split('-').map(Number);
  return anio === ctx.anioActual && mes === ctx.mesActual;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
