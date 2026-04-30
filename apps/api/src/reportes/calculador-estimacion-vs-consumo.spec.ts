import { CalculadorEstimacionVsConsumo } from './calculador-estimacion-vs-consumo';

describe('CalculadorEstimacionVsConsumo', () => {
  // Setup base: dos proyectos, dos proveedores, dos perfiles. Para tener
  // suficientes combinaciones que el desglose pueda agrupar.
  const estimaciones = [
    // P1: 100 senior + 40 junior
    { proyectoId: 1, perfilTecnicoId: 10, horasEstimadas: 100 },
    { proyectoId: 1, perfilTecnicoId: 11, horasEstimadas: 40 },
    // P2: 60 senior
    { proyectoId: 2, perfilTecnicoId: 10, horasEstimadas: 60 },
  ];

  const lineas = [
    // P1, Acme, senior: 80h ofertadas
    { proyectoId: 1, proveedorId: 100, perfilTecnicoId: 10, horasOfertadas: 80 },
    // P1, Otra, senior: 30h ofertadas
    { proyectoId: 1, proveedorId: 200, perfilTecnicoId: 10, horasOfertadas: 30 },
    // P1, Acme, junior: 40h ofertadas
    { proyectoId: 1, proveedorId: 100, perfilTecnicoId: 11, horasOfertadas: 40 },
    // P2, Acme, senior: 50h ofertadas
    { proyectoId: 2, proveedorId: 100, perfilTecnicoId: 10, horasOfertadas: 50 },
  ];

  const consumos = [
    // P1, Acme, senior: 25h consumidas
    { proyectoId: 1, proveedorId: 100, perfilTecnicoId: 10, horasConsumidas: 25 },
    // P1, Otra, senior: 10h consumidas
    { proyectoId: 1, proveedorId: 200, perfilTecnicoId: 10, horasConsumidas: 10 },
    // P1, Acme, junior: 5h consumidas
    { proyectoId: 1, proveedorId: 100, perfilTecnicoId: 11, horasConsumidas: 5 },
  ];

  it('agrupa por (proyecto, perfil) sumando ofertadas/consumidas cross-proveedor', () => {
    const filas = CalculadorEstimacionVsConsumo.calcular({
      estimaciones,
      lineas,
      consumos,
      desglose: 'proyecto-perfil',
    });

    expect(filas).toHaveLength(3);

    const p1Senior = filas.find(
      (f) => f.proyectoId === 1 && f.perfilTecnicoId === 10,
    );
    expect(p1Senior).toMatchObject({
      horasEstimadas: 100,
      horasOfertadas: 110, // 80 + 30
      horasConsumidas: 35, // 25 + 10
      horasPendientes: 75, // 110 - 35
    });

    const p1Junior = filas.find(
      (f) => f.proyectoId === 1 && f.perfilTecnicoId === 11,
    );
    expect(p1Junior).toMatchObject({
      horasEstimadas: 40,
      horasOfertadas: 40,
      horasConsumidas: 5,
      horasPendientes: 35,
    });

    const p2Senior = filas.find(
      (f) => f.proyectoId === 2 && f.perfilTecnicoId === 10,
    );
    expect(p2Senior).toMatchObject({
      horasEstimadas: 60,
      horasOfertadas: 50,
      horasConsumidas: 0,
      horasPendientes: 50,
    });
  });

  it('agrupa por perfil cross-proyecto', () => {
    const filas = CalculadorEstimacionVsConsumo.calcular({
      estimaciones,
      lineas,
      consumos,
      desglose: 'perfil',
    });

    expect(filas).toHaveLength(2);
    const senior = filas.find((f) => f.perfilTecnicoId === 10);
    expect(senior).toMatchObject({
      proyectoId: null,
      proveedorId: null,
      horasEstimadas: 160, // 100 + 60
      horasOfertadas: 160, // 80 + 30 + 50
      horasConsumidas: 35,
      horasPendientes: 125,
    });
    const junior = filas.find((f) => f.perfilTecnicoId === 11);
    expect(junior).toMatchObject({
      horasEstimadas: 40,
      horasOfertadas: 40,
      horasConsumidas: 5,
      horasPendientes: 35,
    });
  });

  it('agrupa por proveedor (estimadas no aplica → 0)', () => {
    const filas = CalculadorEstimacionVsConsumo.calcular({
      estimaciones,
      lineas,
      consumos,
      desglose: 'proveedor',
    });

    expect(filas).toHaveLength(2);
    const acme = filas.find((f) => f.proveedorId === 100);
    expect(acme).toMatchObject({
      proyectoId: null,
      perfilTecnicoId: null,
      horasEstimadas: 0,
      horasOfertadas: 170, // 80 + 40 + 50
      horasConsumidas: 30, // 25 + 5
      horasPendientes: 140,
    });
    const otra = filas.find((f) => f.proveedorId === 200);
    expect(otra).toMatchObject({
      horasEstimadas: 0,
      horasOfertadas: 30,
      horasConsumidas: 10,
      horasPendientes: 20,
    });
  });

  it('aplica filtro por proyectoId', () => {
    const filas = CalculadorEstimacionVsConsumo.calcular({
      estimaciones,
      lineas,
      consumos,
      desglose: 'proyecto-perfil',
      filtros: { proyectoId: 1 },
    });

    expect(filas).toHaveLength(2);
    expect(filas.every((f) => f.proyectoId === 1)).toBe(true);
  });

  it('aplica filtro por proveedorId (excluye estimaciones, que no llevan proveedor)', () => {
    const filas = CalculadorEstimacionVsConsumo.calcular({
      estimaciones,
      lineas,
      consumos,
      desglose: 'proyecto-perfil',
      filtros: { proveedorId: 200 },
    });

    // Sólo la línea P1/Otra/senior, sólo el consumo P1/Otra/senior. No hay
    // estimación con proveedor=200 porque las estimaciones no llevan
    // proveedor; horasEstimadas queda en 0 cuando se filtra por proveedor.
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({
      proyectoId: 1,
      perfilTecnicoId: 10,
      horasEstimadas: 0,
      horasOfertadas: 30,
      horasConsumidas: 10,
      horasPendientes: 20,
    });
  });

  it('aplica filtro por perfilTecnicoId', () => {
    const filas = CalculadorEstimacionVsConsumo.calcular({
      estimaciones,
      lineas,
      consumos,
      desglose: 'perfil',
      filtros: { perfilTecnicoId: 11 },
    });

    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({
      perfilTecnicoId: 11,
      horasEstimadas: 40,
      horasOfertadas: 40,
      horasConsumidas: 5,
      horasPendientes: 35,
    });
  });

  it('devuelve lista vacía cuando no hay datos', () => {
    expect(
      CalculadorEstimacionVsConsumo.calcular({
        estimaciones: [],
        lineas: [],
        consumos: [],
        desglose: 'proyecto-perfil',
      }),
    ).toEqual([]);
  });

  it('redondea a 2 decimales', () => {
    const filas = CalculadorEstimacionVsConsumo.calcular({
      estimaciones: [],
      lineas: [
        {
          proyectoId: 1,
          proveedorId: 100,
          perfilTecnicoId: 10,
          horasOfertadas: 10.123,
        },
      ],
      consumos: [
        {
          proyectoId: 1,
          proveedorId: 100,
          perfilTecnicoId: 10,
          horasConsumidas: 0.336,
        },
      ],
      desglose: 'proyecto-perfil',
    });
    expect(filas[0].horasOfertadas).toBe(10.12);
    expect(filas[0].horasConsumidas).toBe(0.34);
    expect(filas[0].horasPendientes).toBe(9.79);
  });
});
