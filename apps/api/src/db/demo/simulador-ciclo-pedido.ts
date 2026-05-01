// Función pura: para cada Estado objetivo y una fechaCreacion, devuelve la
// secuencia legal de transiciones manuales (acción + fecha) que llevan al
// Pedido desde Borrador hasta el objetivo. Cada paso se valida contra
// MaquinaEstadosPedido.aplicar para que el resultado sea recorrible por la
// máquina de estados real.
//
// Estados terminales reachables vía aplicar (Solicitado, Aprobado, Rechazado,
// Cancelado): la secuencia termina exactamente en el estado objetivo.
// Estados accesibles sólo por consumo (EnEjecucion, Consumido): la secuencia
// llega hasta Aprobado; el seeder fija el estado final tras llamar al
// simulador (los consumos los siembra el slice 5).

import {
  AccionPedido,
  MaquinaEstadosPedido,
} from '../../pedidos/maquina-estados-pedido';
import type { EstadoPedido } from '../schema';

export interface Transicion {
  accion: AccionPedido;
  fecha: string;
}

export class CicloImposibleError extends Error {
  constructor(
    public readonly estadoObjetivo: EstadoPedido,
    public readonly motivo: string,
  ) {
    super(`No se puede simular ciclo a '${estadoObjetivo}': ${motivo}`);
    this.name = 'CicloImposibleError';
  }
}

// El simulador sólo emite acciones manuales. EnEjecucion y Consumido se
// alcanzan vía consumo (no vía aplicar), así que para esos objetivos la
// secuencia se queda en Aprobado.
const SECUENCIAS: Record<EstadoPedido, readonly AccionPedido[]> = {
  Borrador: [],
  Solicitado: ['solicitar'],
  Aprobado: ['solicitar', 'aprobar'],
  EnEjecucion: ['solicitar', 'aprobar'],
  Consumido: ['solicitar', 'aprobar'],
  Rechazado: ['solicitar', 'rechazar'],
  Cancelado: ['solicitar', 'aprobar', 'cancelar'],
};

export function simularCiclo(
  estadoObjetivo: EstadoPedido,
  fechaCreacion: string,
  hoy: string,
  rng: () => number,
): Transicion[] {
  const acciones = SECUENCIAS[estadoObjetivo];
  if (acciones.length === 0) {
    return [];
  }

  const diasDisponibles = diasEntre(fechaCreacion, hoy);
  if (diasDisponibles < acciones.length) {
    throw new CicloImposibleError(
      estadoObjetivo,
      `solo hay ${diasDisponibles} día(s) entre ${fechaCreacion} y ${hoy} para ${acciones.length} transición(es)`,
    );
  }

  const transiciones: Transicion[] = [];
  let estado: EstadoPedido = 'Borrador';
  let ultimoDia = 0;
  for (let i = 0; i < acciones.length; i++) {
    // Ventana i: días estrictamente posteriores a la transición anterior y
    // hasta el corte de la ventana (proporcional a (i+1)/N). Garantiza un
    // día por transición y monotonía estricta cuando diasDisponibles >= N.
    const cortee = Math.floor(((i + 1) * diasDisponibles) / acciones.length);
    const minDia = ultimoDia + 1;
    const maxDia = Math.max(cortee, minDia);
    const dia = minDia + Math.floor(rng() * (maxDia - minDia + 1));
    const fecha = sumarDias(fechaCreacion, dia);
    estado = MaquinaEstadosPedido.aplicar(estado, acciones[i]);
    transiciones.push({ accion: acciones[i], fecha });
    ultimoDia = dia;
  }

  return transiciones;
}

function diasEntre(desde: string, hasta: string): number {
  const [a1, m1, d1] = parsearFecha(desde);
  const [a2, m2, d2] = parsearFecha(hasta);
  const t1 = Date.UTC(a1, m1 - 1, d1);
  const t2 = Date.UTC(a2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86_400_000);
}

function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = parsearFecha(fecha);
  const t = Date.UTC(a, m - 1, d) + dias * 86_400_000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

function parsearFecha(fecha: string): [number, number, number] {
  const [a, m, d] = fecha.split('-').map(Number);
  return [a, m, d];
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
