import {
  CalculadorKpisInicio,
  type ConsumoParaKpis,
  type LineaParaKpis,
  type PedidoParaKpis,
} from './calculador-kpis-inicio';

const ctx = { mesActual: 5, anioActual: 2026 };

const pedidos: PedidoParaKpis[] = [
  { id: 1, estado: 'Borrador' },
  { id: 2, estado: 'Solicitado' },
  { id: 3, estado: 'Solicitado' },
  { id: 4, estado: 'Aprobado' },
  { id: 5, estado: 'EnEjecucion' },
  { id: 6, estado: 'EnEjecucion' },
  { id: 7, estado: 'Consumido' },
  { id: 8, estado: 'Rechazado' },
  { id: 9, estado: 'Cancelado' },
];

const lineas: LineaParaKpis[] = [
  // Línea 10 — pedido 5, cierra en mayo 2026
  {
    id: 10,
    pedidoId: 5,
    horasOfertadas: 100,
    precioHora: 50,
    fechaFin: '2026-05-31',
  },
  // Línea 11 — pedido 6, cierra en agosto 2026
  {
    id: 11,
    pedidoId: 6,
    horasOfertadas: 200,
    precioHora: 75,
    fechaFin: '2026-08-15',
  },
];

const consumos: ConsumoParaKpis[] = [
  // mes actual: 40h * 50 = 2000 (línea 10), 20h * 75 = 1500 (línea 11)
  {
    lineaPedidoId: 10,
    usuarioId: 7,
    mes: 5,
    anio: 2026,
    horasConsumidas: 40,
  },
  {
    lineaPedidoId: 11,
    usuarioId: 8,
    mes: 5,
    anio: 2026,
    horasConsumidas: 20,
  },
  // mes anterior (abril 2026): 30h * 50 = 1500
  {
    lineaPedidoId: 10,
    usuarioId: 7,
    mes: 4,
    anio: 2026,
    horasConsumidas: 30,
  },
];

describe('CalculadorKpisInicio.admin', () => {
  it('cuenta pendientes de aprobación, en ejecución, y horas mes consumidas', () => {
    const k = CalculadorKpisInicio.admin(pedidos, lineas, consumos, ctx);

    expect(k.pendientesAprobacion).toBe(2);
    expect(k.enEjecucion).toBe(2);
    expect(k.horasMesConsumidas).toBe(60);
  });

  it('calcula facturación del mes y delta vs mes anterior', () => {
    const k = CalculadorKpisInicio.admin(pedidos, lineas, consumos, ctx);

    expect(k.facturacionMes).toBe(3500);
    // (3500 - 1500) / 1500 * 100 = 133.33
    expect(k.facturacionMesDelta).toBe(133.33);
  });

  it('delta es null cuando no hay base del mes anterior', () => {
    const soloMesActual = consumos.filter((c) => c.mes === 5 && c.anio === 2026);
    const k = CalculadorKpisInicio.admin(pedidos, lineas, soloMesActual, ctx);

    expect(k.facturacionMes).toBe(3500);
    expect(k.facturacionMesDelta).toBeNull();
  });

  it('todos los KPIs son cero cuando no hay datos', () => {
    const k = CalculadorKpisInicio.admin([], [], [], ctx);

    expect(k.pendientesAprobacion).toBe(0);
    expect(k.enEjecucion).toBe(0);
    expect(k.facturacionMes).toBe(0);
    expect(k.facturacionMesDelta).toBeNull();
    expect(k.horasMesConsumidas).toBe(0);
  });

  it('cruce entre años: mes actual = enero 2026, mes anterior = diciembre 2025', () => {
    const ctxEnero = { mesActual: 1, anioActual: 2026 };
    const consumosCruceAnio: ConsumoParaKpis[] = [
      {
        lineaPedidoId: 10,
        usuarioId: null,
        mes: 1,
        anio: 2026,
        horasConsumidas: 10,
      },
      {
        lineaPedidoId: 10,
        usuarioId: null,
        mes: 12,
        anio: 2025,
        horasConsumidas: 5,
      },
    ];
    const k = CalculadorKpisInicio.admin(
      pedidos,
      lineas,
      consumosCruceAnio,
      ctxEnero,
    );

    expect(k.facturacionMes).toBe(500);
    // (500 - 250) / 250 * 100 = 100
    expect(k.facturacionMesDelta).toBe(100);
  });
});

describe('CalculadorKpisInicio.consultor', () => {
  it('cuenta en ejecución, consumos del mes y líneas que cierran en el mes', () => {
    const k = CalculadorKpisInicio.consultor(
      pedidos,
      lineas,
      consumos,
      ctx,
      7,
    );

    expect(k.enEjecucion).toBe(2);
    expect(k.consumosDelMes).toBe(2);
    expect(k.lineasQueCierranEsteMes).toBe(1); // sólo línea 10 cierra en mayo
  });

  it('misHorasConsumidasMes filtra por usuarioId', () => {
    // usuario 7 sólo registró el consumo de 40h en mayo
    const k1 = CalculadorKpisInicio.consultor(pedidos, lineas, consumos, ctx, 7);
    expect(k1.misHorasConsumidasMes).toBe(40);

    // usuario 8 sólo registró el consumo de 20h en mayo
    const k2 = CalculadorKpisInicio.consultor(pedidos, lineas, consumos, ctx, 8);
    expect(k2.misHorasConsumidasMes).toBe(20);

    // usuario 99 no tiene nada
    const k3 = CalculadorKpisInicio.consultor(pedidos, lineas, consumos, ctx, 99);
    expect(k3.misHorasConsumidasMes).toBe(0);
  });

  it('todos los KPIs son cero cuando no hay datos', () => {
    const k = CalculadorKpisInicio.consultor([], [], [], ctx, 7);

    expect(k.enEjecucion).toBe(0);
    expect(k.consumosDelMes).toBe(0);
    expect(k.lineasQueCierranEsteMes).toBe(0);
    expect(k.misHorasConsumidasMes).toBe(0);
  });
});
