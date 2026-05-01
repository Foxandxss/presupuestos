import { eq } from 'drizzle-orm';

import type { AppDatabase } from '../connection';
import {
  lineasPedido,
  pedidos,
  servicios,
  type EstadoPedido,
  type Pedido,
} from '../schema';
import { clavePerfilProveedor, type CatalogoSembrado } from './catalogo';
import type { FakerEs } from './faker';
import { simularCiclo } from './simulador-ciclo-pedido';

const HOY = '2026-05-01';

interface Cohorte {
  estado: EstadoPedido;
  cuantos: number;
  // Rango de fechaCreacion en días antes de HOY (max < min porque min está
  // más lejos en el pasado).
  diasAntesMin: number;
  diasAntesMax: number;
  // Duración de cada línea en meses (rango).
  duracionMesesMin: number;
  duracionMesesMax: number;
  // Días después de la creación en los que arranca cada línea.
  arranqueDiasMax: number;
}

// Suma 24+15+6+6+4+3+2 = 60. El orden fija el orden de inserción y, por
// ende, los IDs (Pedido 1 = primer Consumido, Pedido 60 = último Cancelado).
const COHORTES: ReadonlyArray<Cohorte> = [
  // Terminales largos: Consumido y EnEjecucion necesitan margen para que las
  // líneas tengan vida útil suficiente y los consumos del slice 5 quepan.
  {
    estado: 'Consumido',
    cuantos: 24,
    diasAntesMin: 365,
    diasAntesMax: 210,
    duracionMesesMin: 3,
    duracionMesesMax: 7,
    arranqueDiasMax: 30,
  },
  {
    estado: 'EnEjecucion',
    cuantos: 15,
    diasAntesMin: 270,
    diasAntesMax: 90,
    duracionMesesMin: 3,
    duracionMesesMax: 9,
    arranqueDiasMax: 21,
  },
  // Aprobado/Solicitado: recientes, líneas que aún no arrancan o recién
  // arrancadas.
  {
    estado: 'Aprobado',
    cuantos: 6,
    diasAntesMin: 60,
    diasAntesMax: 14,
    duracionMesesMin: 1,
    duracionMesesMax: 6,
    arranqueDiasMax: 30,
  },
  {
    estado: 'Solicitado',
    cuantos: 6,
    diasAntesMin: 60,
    diasAntesMax: 5,
    duracionMesesMin: 1,
    duracionMesesMax: 6,
    arranqueDiasMax: 45,
  },
  // Terminales sin Aprobado: Rechazado y Cancelado pueden ser viejos pero no
  // necesitan tanta vida útil de línea.
  {
    estado: 'Rechazado',
    cuantos: 3,
    diasAntesMin: 240,
    diasAntesMax: 90,
    duracionMesesMin: 1,
    duracionMesesMax: 4,
    arranqueDiasMax: 45,
  },
  {
    estado: 'Cancelado',
    cuantos: 2,
    diasAntesMin: 270,
    diasAntesMax: 90,
    duracionMesesMin: 2,
    duracionMesesMax: 6,
    arranqueDiasMax: 30,
  },
  // Borrador: las últimas dos semanas, sin transiciones.
  {
    estado: 'Borrador',
    cuantos: 4,
    diasAntesMin: 14,
    diasAntesMax: 1,
    duracionMesesMin: 1,
    duracionMesesMax: 6,
    arranqueDiasMax: 60,
  },
];

// Slice 5 sube los rangos respecto al slice 4 (era 1-3 líneas y 1-2 recursos)
// para que la masa de ConsumosMensuales caiga en el rango 1700-2300 del PRD.
// Cada línea se garantiza ≥ 2 recursos cuando el proveedor tiene 2 o más
// (siempre, dado que el catálogo siembra 3-8 recursos/proveedor).
const LINEAS_POR_PEDIDO_MIN = 3;
const LINEAS_POR_PEDIDO_MAX = 5;
const HORAS_OFERTADAS_MIN = 50;
const HORAS_OFERTADAS_MAX = 500;
const HORAS_OFERTADAS_PASO = 10;
const RECURSOS_POR_LINEA = 2;

export interface PedidosSembrados {
  pedidosIds: number[];
  // Asignación recursos→línea para slice 5 (consumos).
  recursosPorLinea: Map<number, number[]>;
}

export function sembrarPedidos(
  db: AppDatabase,
  faker: FakerEs,
  catalogo: CatalogoSembrado,
  proyectosIds: number[],
): PedidosSembrados {
  const proveedoresConServicios = perfilesPorProveedor(catalogo);
  const proveedoresElegibles = [...proveedoresConServicios.keys()].sort(
    (a, b) => a - b,
  );
  if (proveedoresElegibles.length === 0) {
    throw new Error(
      'sembrarPedidos: ningún proveedor del catálogo tiene servicios definidos',
    );
  }

  const rng = () => faker.number.float({ min: 0, max: 1 });
  const pedidosIds: number[] = [];
  const recursosPorLinea = new Map<number, number[]>();
  let indiceGlobal = 0;

  for (const cohorte of COHORTES) {
    for (let i = 0; i < cohorte.cuantos; i++) {
      // Round-robin sobre proveedores y proyectos para garantizar una
      // distribución estable y reproducible en cada re-run.
      const proveedorId =
        proveedoresElegibles[indiceGlobal % proveedoresElegibles.length];
      const proyectoId = proyectosIds[indiceGlobal % proyectosIds.length];
      const perfilesProveedor = proveedoresConServicios.get(proveedorId);
      if (!perfilesProveedor) {
        throw new Error(
          `sembrarPedidos: proveedor ${proveedorId} sin perfiles disponibles`,
        );
      }
      const recursosProveedor =
        catalogo.recursosPorProveedor.get(proveedorId) ?? [];

      const fechaCreacion = generarFechaCreacion(faker, cohorte);
      const pedidoId = insertarPedido(db, {
        proyectoId,
        proveedorId,
        fechaCreacion,
      });
      pedidosIds.push(pedidoId);

      const lineas = sembrarLineas(db, faker, {
        pedidoId,
        proveedorId,
        perfilesDisponibles: perfilesProveedor,
        servicioIdPorProveedorPerfil: catalogo.servicioIdPorProveedorPerfil,
        cohorte,
        fechaCreacion,
      });

      // 2 recursos por línea (capado a la oferta del proveedor) — la
      // asignación se guarda para slice 5. Fijar en 2 garantiza que el
      // repartidor use los dos huecos del UNIQUE(linea, recurso, mes, anio)
      // en cada mes y la masa de consumos quepa en el rango del PRD.
      for (const lineaId of lineas.lineaIds) {
        const cuantos = Math.min(RECURSOS_POR_LINEA, recursosProveedor.length);
        const seleccion = [
          ...faker.helpers.arrayElements(recursosProveedor, cuantos),
        ].sort((a, b) => a - b);
        recursosPorLinea.set(lineaId, seleccion);
      }

      aplicarTransiciones(db, {
        pedidoId,
        estadoObjetivo: cohorte.estado,
        fechaCreacion,
        rng,
      });

      indiceGlobal++;
    }
  }

  return { pedidosIds, recursosPorLinea };
}

function perfilesPorProveedor(
  catalogo: CatalogoSembrado,
): Map<number, number[]> {
  const out = new Map<number, number[]>();
  for (const clave of catalogo.servicioIdPorProveedorPerfil.keys()) {
    const [proveedorStr, perfilStr] = clave.split(':');
    const proveedorId = Number(proveedorStr);
    const perfilTecnicoId = Number(perfilStr);
    const lista = out.get(proveedorId) ?? [];
    lista.push(perfilTecnicoId);
    out.set(proveedorId, lista);
  }
  for (const lista of out.values()) {
    lista.sort((a, b) => a - b);
  }
  return out;
}

function generarFechaCreacion(faker: FakerEs, cohorte: Cohorte): string {
  const dias = faker.number.int({
    min: cohorte.diasAntesMax,
    max: cohorte.diasAntesMin,
  });
  return sumarDias(HOY, -dias);
}

function insertarPedido(
  db: AppDatabase,
  args: { proyectoId: number; proveedorId: number; fechaCreacion: string },
): number {
  const createdAt = `${args.fechaCreacion} 00:00:00`;
  const [row] = db
    .insert(pedidos)
    .values({
      proyectoId: args.proyectoId,
      proveedorId: args.proveedorId,
      estado: 'Borrador',
      createdAt,
      updatedAt: createdAt,
    })
    .returning({ id: pedidos.id })
    .all();
  return row.id;
}

function sembrarLineas(
  db: AppDatabase,
  faker: FakerEs,
  args: {
    pedidoId: number;
    proveedorId: number;
    perfilesDisponibles: number[];
    servicioIdPorProveedorPerfil: Map<string, number>;
    cohorte: Cohorte;
    fechaCreacion: string;
  },
): { lineaIds: number[] } {
  const max = Math.min(LINEAS_POR_PEDIDO_MAX, args.perfilesDisponibles.length);
  // Si el proveedor tiene < LINEAS_POR_PEDIDO_MIN perfiles disponibles,
  // bajamos el suelo para que faker no se queje. Sucede cuando el corte del
  // 60% del cross-product en sembrarServicios deja a algún proveedor con
  // pocos perfiles cubiertos.
  const min = Math.min(LINEAS_POR_PEDIDO_MIN, max);
  const cuantos = faker.number.int({ min, max });
  // Sin reemplazo + sort estable: respeta UNIQUE implícito por perfil dentro
  // del pedido (no obligatorio en el schema, pero tiene sentido funcional)
  // y fija el orden de inserción para que los IDs sean reproducibles.
  const perfiles = [
    ...faker.helpers.arrayElements(args.perfilesDisponibles, cuantos),
  ].sort((a, b) => a - b);

  const lineaIds: number[] = [];
  for (const perfilTecnicoId of perfiles) {
    const arranqueDias = faker.number.int({
      min: 0,
      max: args.cohorte.arranqueDiasMax,
    });
    const fechaInicio = sumarDias(args.fechaCreacion, arranqueDias);
    const duracionMeses = faker.number.int({
      min: args.cohorte.duracionMesesMin,
      max: args.cohorte.duracionMesesMax,
    });
    const fechaFin = sumarMesesAFecha(fechaInicio, duracionMeses);
    const horasOfertadas =
      faker.number.int({
        min: HORAS_OFERTADAS_MIN / HORAS_OFERTADAS_PASO,
        max: HORAS_OFERTADAS_MAX / HORAS_OFERTADAS_PASO,
      }) * HORAS_OFERTADAS_PASO;
    const servicioId = args.servicioIdPorProveedorPerfil.get(
      clavePerfilProveedor(args.proveedorId, perfilTecnicoId),
    );
    if (servicioId === undefined) {
      throw new Error(
        `sembrarPedidos: no hay servicio para proveedor=${args.proveedorId} perfil=${perfilTecnicoId}`,
      );
    }
    const tarifa = obtenerTarifa(db, servicioId);

    const [row] = db
      .insert(lineasPedido)
      .values({
        pedidoId: args.pedidoId,
        perfilTecnicoId,
        fechaInicio,
        fechaFin,
        horasOfertadas,
        precioHora: tarifa,
        tarifaCongelada: false,
      })
      .returning({ id: lineasPedido.id })
      .all();
    lineaIds.push(row.id);
  }
  return { lineaIds };
}

function obtenerTarifa(db: AppDatabase, servicioId: number): number {
  const [row] = db
    .select({ tarifaPorHora: servicios.tarifaPorHora })
    .from(servicios)
    .where(eq(servicios.id, servicioId))
    .all();
  return row.tarifaPorHora;
}

function aplicarTransiciones(
  db: AppDatabase,
  args: {
    pedidoId: number;
    estadoObjetivo: EstadoPedido;
    fechaCreacion: string;
    rng: () => number;
  },
): void {
  const transiciones = simularCiclo(
    args.estadoObjetivo,
    args.fechaCreacion,
    HOY,
    args.rng,
  );

  let estado: EstadoPedido = 'Borrador';
  for (const t of transiciones) {
    const updates: Partial<Pedido> = {};
    if (t.accion === 'solicitar') {
      estado = 'Solicitado';
      updates.fechaSolicitud = t.fecha;
    } else if (t.accion === 'aprobar') {
      estado = 'Aprobado';
      updates.fechaAprobacion = t.fecha;
    } else if (t.accion === 'rechazar') {
      estado = 'Rechazado';
    } else if (t.accion === 'cancelar') {
      estado = 'Cancelado';
    }
    updates.estado = estado;
    const updatedAt = `${t.fecha} 00:00:00`;
    db.update(pedidos)
      .set({ ...updates, updatedAt })
      .where(eq(pedidos.id, args.pedidoId))
      .run();

    // Side effect que replica PedidosService.transitar: al aprobar, congelar
    // las tarifas vigentes en cada línea.
    if (t.accion === 'aprobar') {
      db.update(lineasPedido)
        .set({ tarifaCongelada: true, updatedAt })
        .where(eq(lineasPedido.pedidoId, args.pedidoId))
        .run();
    }
  }

  // EnEjecucion/Consumido se alcanzan vía consumo, no vía aplicar. Slice 5
  // sembrará los consumos; aquí dejamos el estado final fijado al objetivo
  // para que el reporte y los listados muestren los 7 valores.
  if (
    args.estadoObjetivo === 'EnEjecucion' ||
    args.estadoObjetivo === 'Consumido'
  ) {
    db.update(pedidos)
      .set({ estado: args.estadoObjetivo })
      .where(eq(pedidos.id, args.pedidoId))
      .run();
  }
}

function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const t = Date.UTC(a, m - 1, d) + dias * 86_400_000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

function sumarMesesAFecha(fecha: string, meses: number): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const total = a * 12 + (m - 1) + meses;
  const anio = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const dia = Math.min(d, ultimo);
  return `${anio}-${pad2(mes)}-${pad2(dia)}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
