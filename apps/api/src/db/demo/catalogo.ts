import type { AppDatabase } from '../connection';
import { perfilesTecnicos, proveedores, recursos, servicios } from '../schema';
import type { FakerEs } from './faker';

interface RangoTarifa {
  readonly min: number;
  readonly max: number;
}

interface PerfilDemo {
  readonly nombre: string;
  readonly rango: RangoTarifa;
}

// Rangos €/h del PRD #9 (Slice 2). El orden fija el ID que recibe cada perfil.
const PERFILES: ReadonlyArray<PerfilDemo> = [
  { nombre: 'Junior', rango: { min: 30, max: 45 } },
  { nombre: 'Mid', rango: { min: 45, max: 65 } },
  { nombre: 'QA', rango: { min: 40, max: 60 } },
  { nombre: 'Designer', rango: { min: 50, max: 75 } },
  { nombre: 'Senior', rango: { min: 60, max: 90 } },
  { nombre: 'DevOps', rango: { min: 65, max: 90 } },
  { nombre: 'PM', rango: { min: 70, max: 100 } },
  { nombre: 'Architect', rango: { min: 85, max: 120 } },
];

const NUM_PROVEEDORES = 10;
const RECURSOS_POR_PROVEEDOR_MIN = 3;
const RECURSOS_POR_PROVEEDOR_MAX = 8;
const RATIO_SERVICIOS = 0.6;

export interface CatalogoSembrado {
  proveedoresIds: number[];
  perfilesIds: number[];
  recursosPorProveedor: Map<number, number[]>;
  servicioIdPorProveedorPerfil: Map<string, number>;
}

export function clavePerfilProveedor(proveedorId: number, perfilTecnicoId: number): string {
  return `${proveedorId}:${perfilTecnicoId}`;
}

export function sembrarCatalogo(db: AppDatabase, faker: FakerEs): CatalogoSembrado {
  const proveedoresIds = sembrarProveedores(db, faker);
  const perfilesIds = sembrarPerfiles(db);
  const recursosPorProveedor = sembrarRecursos(db, faker, proveedoresIds);
  const servicioIdPorProveedorPerfil = sembrarServicios(
    db,
    faker,
    proveedoresIds,
    perfilesIds,
  );
  return {
    proveedoresIds,
    perfilesIds,
    recursosPorProveedor,
    servicioIdPorProveedorPerfil,
  };
}

function sembrarProveedores(db: AppDatabase, faker: FakerEs): number[] {
  const nombres = faker.helpers.uniqueArray(
    () => faker.company.name(),
    NUM_PROVEEDORES,
  );
  const ids: number[] = [];
  for (const nombre of nombres) {
    const [row] = db
      .insert(proveedores)
      .values({ nombre })
      .returning({ id: proveedores.id })
      .all();
    ids.push(row.id);
  }
  return ids;
}

function sembrarPerfiles(db: AppDatabase): number[] {
  const ids: number[] = [];
  for (const { nombre } of PERFILES) {
    const [row] = db
      .insert(perfilesTecnicos)
      .values({ nombre })
      .returning({ id: perfilesTecnicos.id })
      .all();
    ids.push(row.id);
  }
  return ids;
}

function sembrarRecursos(
  db: AppDatabase,
  faker: FakerEs,
  proveedoresIds: number[],
): Map<number, number[]> {
  const porProveedor = new Map<number, number[]>();
  for (const proveedorId of proveedoresIds) {
    const cuantos = faker.number.int({
      min: RECURSOS_POR_PROVEEDOR_MIN,
      max: RECURSOS_POR_PROVEEDOR_MAX,
    });
    const nombres = faker.helpers.uniqueArray(
      () => faker.person.fullName(),
      cuantos,
    );
    const ids: number[] = [];
    for (const nombre of nombres) {
      const [row] = db
        .insert(recursos)
        .values({ nombre, proveedorId })
        .returning({ id: recursos.id })
        .all();
      ids.push(row.id);
    }
    porProveedor.set(proveedorId, ids);
  }
  return porProveedor;
}

function sembrarServicios(
  db: AppDatabase,
  faker: FakerEs,
  proveedoresIds: number[],
  perfilesIds: number[],
): Map<string, number> {
  const combos: Array<{
    proveedorId: number;
    perfilTecnicoId: number;
    perfilIndex: number;
  }> = [];
  for (const proveedorId of proveedoresIds) {
    perfilesIds.forEach((perfilTecnicoId, perfilIndex) => {
      combos.push({ proveedorId, perfilTecnicoId, perfilIndex });
    });
  }

  const cuantos = Math.round(combos.length * RATIO_SERVICIOS);
  // Shuffle + slice cubre el ~60% del cross-product variando qué pares se quedan;
  // sort posterior fija el orden de inserción para que los IDs sean estables.
  const seleccion = faker.helpers
    .shuffle([...combos])
    .slice(0, cuantos)
    .sort(
      (a, b) =>
        a.proveedorId - b.proveedorId ||
        a.perfilTecnicoId - b.perfilTecnicoId,
    );

  const idPorClave = new Map<string, number>();
  for (const { proveedorId, perfilTecnicoId, perfilIndex } of seleccion) {
    const { min, max } = PERFILES[perfilIndex].rango;
    const tarifaPorHora = redondear2(
      faker.number.float({ min, max, fractionDigits: 2 }),
    );
    const [row] = db
      .insert(servicios)
      .values({ proveedorId, perfilTecnicoId, tarifaPorHora })
      .returning({ id: servicios.id })
      .all();
    idPorClave.set(clavePerfilProveedor(proveedorId, perfilTecnicoId), row.id);
  }
  return idPorClave;
}

function redondear2(valor: number): number {
  return Math.round(valor * 100) / 100;
}
