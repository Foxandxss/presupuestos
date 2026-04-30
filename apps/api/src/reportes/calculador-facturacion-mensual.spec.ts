import { CalculadorFacturacionMensual } from './calculador-facturacion-mensual';

describe('CalculadorFacturacionMensual', () => {
  const consumos = [
    // Abril 2026, Acme, P1, senior: 20h × 75€ = 1500€
    {
      mes: 4,
      anio: 2026,
      proveedorId: 100,
      proyectoId: 1,
      lineaPedidoId: 1000,
      recursoId: 5000,
      perfilTecnicoId: 10,
      horasConsumidas: 20,
      precioHora: 75,
    },
    // Abril 2026, Acme, P1, senior: otro recurso: 10h × 75€ = 750€
    {
      mes: 4,
      anio: 2026,
      proveedorId: 100,
      proyectoId: 1,
      lineaPedidoId: 1000,
      recursoId: 5001,
      perfilTecnicoId: 10,
      horasConsumidas: 10,
      precioHora: 75,
    },
    // Abril 2026, Otra, P1, senior: 5h × 80€ = 400€
    {
      mes: 4,
      anio: 2026,
      proveedorId: 200,
      proyectoId: 1,
      lineaPedidoId: 1001,
      recursoId: 5100,
      perfilTecnicoId: 10,
      horasConsumidas: 5,
      precioHora: 80,
    },
    // Mayo 2026, Acme, P2, junior: 15h × 50€ = 750€
    {
      mes: 5,
      anio: 2026,
      proveedorId: 100,
      proyectoId: 2,
      lineaPedidoId: 1002,
      recursoId: 5000,
      perfilTecnicoId: 11,
      horasConsumidas: 15,
      precioHora: 50,
    },
    // Marzo 2025, Acme, P1, senior: 8h × 70€ = 560€ (otro año)
    {
      mes: 3,
      anio: 2025,
      proveedorId: 100,
      proyectoId: 1,
      lineaPedidoId: 999,
      recursoId: 5000,
      perfilTecnicoId: 10,
      horasConsumidas: 8,
      precioHora: 70,
    },
  ];

  it('agrupa por (mes, año, proveedor) sumando importes', () => {
    const filas = CalculadorFacturacionMensual.calcular(consumos);
    expect(filas).toHaveLength(4);

    const abril2026Acme = filas.find(
      (f) => f.mes === 4 && f.anio === 2026 && f.proveedorId === 100,
    );
    expect(abril2026Acme?.totalEur).toBe(2250); // 1500 + 750
    expect(abril2026Acme?.detalle).toHaveLength(2);

    const abril2026Otra = filas.find(
      (f) => f.mes === 4 && f.anio === 2026 && f.proveedorId === 200,
    );
    expect(abril2026Otra?.totalEur).toBe(400);

    const mayo2026 = filas.find((f) => f.mes === 5 && f.anio === 2026);
    expect(mayo2026?.totalEur).toBe(750);

    const marzo2025 = filas.find((f) => f.mes === 3 && f.anio === 2025);
    expect(marzo2025?.totalEur).toBe(560);
  });

  it('ordena por año, mes y proveedor', () => {
    const filas = CalculadorFacturacionMensual.calcular(consumos);
    expect(filas.map((f) => `${f.anio}-${f.mes}-${f.proveedorId}`)).toEqual([
      '2025-3-100',
      '2026-4-100',
      '2026-4-200',
      '2026-5-100',
    ]);
  });

  it('filtra por rango mesDesde/mesHasta inclusivo', () => {
    const filas = CalculadorFacturacionMensual.calcular(consumos, {
      mesDesde: { mes: 4, anio: 2026 },
      mesHasta: { mes: 4, anio: 2026 },
    });
    expect(filas).toHaveLength(2); // sólo abril 2026 (Acme y Otra)
    expect(filas.every((f) => f.mes === 4 && f.anio === 2026)).toBe(true);
  });

  it('mesDesde sin mesHasta filtra abierto hacia adelante', () => {
    const filas = CalculadorFacturacionMensual.calcular(consumos, {
      mesDesde: { mes: 5, anio: 2026 },
    });
    expect(filas).toHaveLength(1);
    expect(filas[0].mes).toBe(5);
  });

  it('filtra por anio', () => {
    const filas = CalculadorFacturacionMensual.calcular(consumos, {
      anio: 2025,
    });
    expect(filas).toHaveLength(1);
    expect(filas[0].anio).toBe(2025);
  });

  it('filtra por proveedorId', () => {
    const filas = CalculadorFacturacionMensual.calcular(consumos, {
      proveedorId: 200,
    });
    expect(filas).toHaveLength(1);
    expect(filas[0].proveedorId).toBe(200);
  });

  it('filtra por proyectoId (afecta al detalle también)', () => {
    const filas = CalculadorFacturacionMensual.calcular(consumos, {
      proyectoId: 1,
    });
    // Excluye P2 (mayo); quedan abril Acme, abril Otra, marzo 2025 Acme
    expect(filas).toHaveLength(3);
    expect(filas.every((f) => f.detalle.every((d) => d.proyectoId === 1))).toBe(
      true,
    );
  });

  it('importe por detalle = horas × precioHora redondeado', () => {
    const filas = CalculadorFacturacionMensual.calcular([
      {
        mes: 1,
        anio: 2026,
        proveedorId: 1,
        proyectoId: 1,
        lineaPedidoId: 1,
        recursoId: 1,
        perfilTecnicoId: 1,
        horasConsumidas: 7.5,
        precioHora: 88.4,
      },
    ]);
    expect(filas[0].totalEur).toBe(663);
    expect(filas[0].detalle[0].importe).toBe(663);
  });

  it('devuelve lista vacía con array vacío', () => {
    expect(CalculadorFacturacionMensual.calcular([])).toEqual([]);
  });
});
