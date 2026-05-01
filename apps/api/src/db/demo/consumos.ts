import { eq } from 'drizzle-orm';

import type { AppDatabase } from '../connection';
import {
  consumosMensuales,
  lineasPedido,
  pedidos,
  type EstadoPedido,
} from '../schema';
import type { FakerEs } from './faker';
import {
  type FilaConsumo,
  repartirHoras,
} from './repartidor-horas-mensual';

const HOY = '2026-05-01';

interface CohorteConsumo {
  // Ratio horasConsumidas / horasOfertadas a nivel de línea. ValidadorConsumo
  // rechaza > 1.0, así que las cohortes 'over' / 'blow-up' del PRD se
  // manifiestan a nivel de proyecto (sumando varios pedidos contra una
  // EstimaciónPerfil) y no a nivel de línea.
  ratioMin: number;
  ratioMax: number;
  // Probabilidad de que un pedido en este estado tenga consumos.
  probConsumir: number;
  // Probabilidad de que una línea elegible reciba consumos (cuando el pedido
  // los tiene). Sólo aplica si !todasLasLineas.
  probLineaConConsumo: number;
  // Si true, todas las líneas reciben consumos (Consumido).
  todasLasLineas: boolean;
}

// Para EnEjecucion el cap es < 1.0 estricto: ninguna línea puede llegar al
// 100% (de lo contrario el pedido transitaría a Consumido). Para Aprobado el
// ratio es bajo para que el pedido siga visualmente en 'Aprobado' aunque
// alguno arrastre consumos iniciales (escenario realista: el cliente registra
// su primer parte y la auto-transición lo lleva a EnEjecucion — pero como
// estamos sembrando directo, nos saltamos la auto-transición y lo dejamos en
// Aprobado para cubrir ese estado en los listados).
const COHORTES: Partial<Record<EstadoPedido, CohorteConsumo>> = {
  Consumido: {
    ratioMin: 1.0,
    ratioMax: 1.0,
    probConsumir: 1.0,
    probLineaConConsumo: 1.0,
    todasLasLineas: true,
  },
  EnEjecucion: {
    ratioMin: 0.4,
    ratioMax: 0.85,
    probConsumir: 1.0,
    probLineaConConsumo: 0.85,
    todasLasLineas: false,
  },
  Aprobado: {
    ratioMin: 0.05,
    ratioMax: 0.2,
    probConsumir: 0.5,
    probLineaConConsumo: 0.7,
    todasLasLineas: false,
  },
};

interface LineaParaConsumo {
  pedidoId: number;
  lineaId: number;
  estado: EstadoPedido;
  fechaInicio: string;
  fechaFin: string;
  horasOfertadas: number;
}

export function sembrarConsumos(
  db: AppDatabase,
  faker: FakerEs,
  recursosPorLinea: Map<number, number[]>,
): void {
  const rng = () => faker.number.float({ min: 0, max: 1 });

  const filas = cargarLineas(db);
  const porPedido = agruparPorPedido(filas);

  // Iterar pedidos en orden de ID para que el orden de inserción y, por ende,
  // los IDs de los consumos sean reproducibles entre re-runs.
  const pedidosIds = [...porPedido.keys()].sort((a, b) => a - b);
  for (const pedidoId of pedidosIds) {
    const lineas = porPedido.get(pedidoId);
    if (!lineas || lineas.length === 0) continue;
    const cohorte = COHORTES[lineas[0].estado];
    if (!cohorte) continue;
    if (rng() >= cohorte.probConsumir) continue;

    sembrarPedidoConsumos(db, faker, lineas, cohorte, recursosPorLinea, rng);
  }
}

function sembrarPedidoConsumos(
  db: AppDatabase,
  faker: FakerEs,
  lineas: LineaParaConsumo[],
  cohorte: CohorteConsumo,
  recursosPorLinea: Map<number, number[]>,
  rng: () => number,
): void {
  // Sort por id para garantizar orden de inserción reproducible.
  const ordenadas = [...lineas].sort((a, b) => a.lineaId - b.lineaId);

  // Para EnEjecucion debe haber al menos UNA línea con consumos > 0. Si todos
  // los sorteos rechazan la línea, forzamos la primera para cumplir el AC.
  let alMenosUna = false;
  for (let i = 0; i < ordenadas.length; i++) {
    const linea = ordenadas[i];
    const recursos = recursosPorLinea.get(linea.lineaId);
    if (!recursos || recursos.length === 0) continue;

    const esUltima = i === ordenadas.length - 1;
    const debeForzar =
      !cohorte.todasLasLineas &&
      linea.estado === 'EnEjecucion' &&
      esUltima &&
      !alMenosUna;
    const incluir =
      cohorte.todasLasLineas ||
      debeForzar ||
      rng() < cohorte.probLineaConConsumo;
    if (!incluir) continue;

    const ratio =
      cohorte.ratioMin === cohorte.ratioMax
        ? cohorte.ratioMin
        : cohorte.ratioMin + rng() * (cohorte.ratioMax - cohorte.ratioMin);

    let horasTotal = redondear2(linea.horasOfertadas * ratio);
    if (horasTotal > linea.horasOfertadas) {
      horasTotal = linea.horasOfertadas;
    }
    if (horasTotal <= 0) continue;

    const fechaFinEfectiva =
      linea.fechaFin > HOY ? HOY : linea.fechaFin;
    if (fechaFinEfectiva < linea.fechaInicio) continue;
    const mesInicio = parsearMesAnio(linea.fechaInicio);
    const mesFin = parsearMesAnio(fechaFinEfectiva);

    const filasReparto = repartirHoras(
      horasTotal,
      mesInicio,
      mesFin,
      recursos,
      rng,
    );

    insertarFilas(db, faker, linea.lineaId, filasReparto);
    if (filasReparto.length > 0) alMenosUna = true;
  }
}

function insertarFilas(
  db: AppDatabase,
  faker: FakerEs,
  lineaPedidoId: number,
  filas: FilaConsumo[],
): void {
  for (const fila of filas) {
    if (fila.horas <= 0) continue;
    const fechaRegistro = fechaRegistroPara(fila.mes, fila.anio, faker);
    const createdAt = `${fechaRegistro} 00:00:00`;
    db.insert(consumosMensuales)
      .values({
        lineaPedidoId,
        recursoId: fila.recursoId,
        mes: fila.mes,
        anio: fila.anio,
        horasConsumidas: redondear2(fila.horas),
        fechaRegistro,
        createdAt,
        updatedAt: createdAt,
      })
      .run();
  }
}

function cargarLineas(db: AppDatabase): LineaParaConsumo[] {
  return db
    .select({
      pedidoId: pedidos.id,
      lineaId: lineasPedido.id,
      estado: pedidos.estado,
      fechaInicio: lineasPedido.fechaInicio,
      fechaFin: lineasPedido.fechaFin,
      horasOfertadas: lineasPedido.horasOfertadas,
    })
    .from(lineasPedido)
    .innerJoin(pedidos, eq(pedidos.id, lineasPedido.pedidoId))
    .all();
}

function agruparPorPedido(
  filas: LineaParaConsumo[],
): Map<number, LineaParaConsumo[]> {
  const out = new Map<number, LineaParaConsumo[]>();
  for (const f of filas) {
    const lista = out.get(f.pedidoId) ?? [];
    lista.push(f);
    out.set(f.pedidoId, lista);
  }
  return out;
}

function fechaRegistroPara(
  mes: number,
  anio: number,
  faker: FakerEs,
): string {
  // Se registra entre 5 y 10 días tras el cierre del mes (mes siguiente).
  let mesSiguiente = mes + 1;
  let anioSiguiente = anio;
  if (mesSiguiente > 12) {
    mesSiguiente = 1;
    anioSiguiente++;
  }
  const dia = faker.number.int({ min: 5, max: 10 });
  const fecha = `${anioSiguiente}-${pad2(mesSiguiente)}-${pad2(dia)}`;
  return fecha > HOY ? HOY : fecha;
}

function parsearMesAnio(fecha: string): { mes: number; anio: number } {
  const [a, m] = fecha.split('-').map(Number);
  return { mes: m, anio: a };
}

function redondear2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
