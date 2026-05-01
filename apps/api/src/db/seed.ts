import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';

import { createDatabase } from './connection';
import {
  consumosMensuales,
  estimacionesPerfil,
  lineasPedido,
  meta,
  pedidos,
  perfilesTecnicos,
  proveedores,
  proyectos,
  recursos,
  servicios,
  usuarios,
  type EstadoPedido,
} from './schema';

const db = createDatabase();
const now = new Date().toISOString();

db.insert(meta)
  .values({ key: 'seeded_at', value: now })
  .onConflictDoUpdate({ target: meta.key, set: { value: now } })
  .run();

// --- Usuarios ----------------------------------------------------------------
const usuariosSemilla = [
  { email: 'admin@demo.com', password: 'admin123', rol: 'admin' as const },
  {
    email: 'consultor@demo.com',
    password: 'consultor123',
    rol: 'consultor' as const,
  },
];

for (const { email, password, rol } of usuariosSemilla) {
  const passwordHash = bcrypt.hashSync(password, 10);
  db.insert(usuarios)
    .values({ email, passwordHash, rol })
    .onConflictDoUpdate({
      target: usuarios.email,
      set: { passwordHash, rol, updatedAt: now },
    })
    .run();
}

// --- Helpers ------------------------------------------------------------------
function upsertProveedor(nombre: string): number {
  const existente = db
    .select({ id: proveedores.id })
    .from(proveedores)
    .where(eq(proveedores.nombre, nombre))
    .get();
  if (existente) return existente.id;
  const [row] = db
    .insert(proveedores)
    .values({ nombre })
    .returning({ id: proveedores.id })
    .all();
  return row.id;
}

function upsertPerfil(nombre: string): number {
  const existente = db
    .select({ id: perfilesTecnicos.id })
    .from(perfilesTecnicos)
    .where(eq(perfilesTecnicos.nombre, nombre))
    .get();
  if (existente) return existente.id;
  const [row] = db
    .insert(perfilesTecnicos)
    .values({ nombre })
    .returning({ id: perfilesTecnicos.id })
    .all();
  return row.id;
}

function upsertServicio(
  proveedorId: number,
  perfilTecnicoId: number,
  tarifaPorHora: number,
): number {
  const existente = db
    .select({ id: servicios.id })
    .from(servicios)
    .where(
      and(
        eq(servicios.proveedorId, proveedorId),
        eq(servicios.perfilTecnicoId, perfilTecnicoId),
      ),
    )
    .get();
  if (existente) return existente.id;
  const [row] = db
    .insert(servicios)
    .values({ proveedorId, perfilTecnicoId, tarifaPorHora })
    .returning({ id: servicios.id })
    .all();
  return row.id;
}

function upsertRecurso(nombre: string, proveedorId: number): number {
  const existente = db
    .select({ id: recursos.id })
    .from(recursos)
    .where(and(eq(recursos.nombre, nombre), eq(recursos.proveedorId, proveedorId)))
    .get();
  if (existente) return existente.id;
  const [row] = db
    .insert(recursos)
    .values({ nombre, proveedorId })
    .returning({ id: recursos.id })
    .all();
  return row.id;
}

function upsertProyecto(
  nombre: string,
  fechaInicio: string,
  fechaFin: string | null,
  descripcion: string | null,
): number {
  const existente = db
    .select({ id: proyectos.id })
    .from(proyectos)
    .where(eq(proyectos.nombre, nombre))
    .get();
  if (existente) return existente.id;
  const [row] = db
    .insert(proyectos)
    .values({ nombre, fechaInicio, fechaFin, descripcion })
    .returning({ id: proyectos.id })
    .all();
  return row.id;
}

function upsertEstimacion(
  proyectoId: number,
  perfilTecnicoId: number,
  horasEstimadas: number,
): void {
  const existente = db
    .select({ id: estimacionesPerfil.id })
    .from(estimacionesPerfil)
    .where(
      and(
        eq(estimacionesPerfil.proyectoId, proyectoId),
        eq(estimacionesPerfil.perfilTecnicoId, perfilTecnicoId),
      ),
    )
    .get();
  if (existente) return;
  db.insert(estimacionesPerfil)
    .values({ proyectoId, perfilTecnicoId, horasEstimadas })
    .run();
}

// --- Catálogo -----------------------------------------------------------------
const proveedorAcme = upsertProveedor('Acme Tech S.L.');
const proveedorBeta = upsertProveedor('Beta Consulting');

const perfilSenior = upsertPerfil('Senior');
const perfilJunior = upsertPerfil('Junior');
const perfilPM = upsertPerfil('Project Manager');
const perfilDiseno = upsertPerfil('Diseñador');

upsertServicio(proveedorAcme, perfilSenior, 60);
upsertServicio(proveedorAcme, perfilJunior, 35);
upsertServicio(proveedorAcme, perfilDiseno, 50);
upsertServicio(proveedorBeta, perfilSenior, 65);
upsertServicio(proveedorBeta, perfilPM, 80);

const recursoAna = upsertRecurso('Ana García', proveedorAcme);
const recursoLuis = upsertRecurso('Luis Pérez', proveedorAcme);
upsertRecurso('Carmen Ruiz', proveedorBeta);
upsertRecurso('Diego Romero', proveedorBeta);

// --- Proyectos ----------------------------------------------------------------
const proyectoMigracion = upsertProyecto(
  'Migración Plataforma Web',
  '2026-01-15',
  null,
  'Modernización de la plataforma de comercio electrónico hacia microservicios.',
);
const proyectoAuditoria = upsertProyecto(
  'Auditoría Seguridad Q2 2026',
  '2026-04-01',
  '2026-06-30',
  'Auditoría externa de seguridad sobre aplicaciones críticas.',
);

upsertEstimacion(proyectoMigracion, perfilSenior, 200);
upsertEstimacion(proyectoMigracion, perfilJunior, 100);
upsertEstimacion(proyectoMigracion, perfilDiseno, 60);
upsertEstimacion(proyectoAuditoria, perfilSenior, 80);
upsertEstimacion(proyectoAuditoria, perfilPM, 20);

// --- Pedidos / Líneas / Consumos ---------------------------------------------
// Sólo se siembran si no hay pedidos previos: una vez que el usuario empieza a
// trabajar contra la app, no queremos pisar los datos reales con la demo.
const yaHayPedidos = db.select({ id: pedidos.id }).from(pedidos).get();

if (!yaHayPedidos) {
  function crearPedidoDemo(
    proyectoId: number,
    proveedorId: number,
    estado: EstadoPedido,
    fechaSolicitud: string | null,
    fechaAprobacion: string | null,
    lineas: Array<{
      perfilTecnicoId: number;
      fechaInicio: string;
      fechaFin: string;
      horasOfertadas: number;
      precioHora: number;
      tarifaCongelada: boolean;
    }>,
  ): { pedidoId: number; lineaIds: number[] } {
    const [pedido] = db
      .insert(pedidos)
      .values({
        proyectoId,
        proveedorId,
        estado,
        fechaSolicitud,
        fechaAprobacion,
      })
      .returning({ id: pedidos.id })
      .all();
    const lineaIds: number[] = [];
    for (const linea of lineas) {
      const [creada] = db
        .insert(lineasPedido)
        .values({ pedidoId: pedido.id, ...linea })
        .returning({ id: lineasPedido.id })
        .all();
      lineaIds.push(creada.id);
    }
    return { pedidoId: pedido.id, lineaIds };
  }

  // Pedido 1: Borrador, sin solicitar.
  crearPedidoDemo(
    proyectoMigracion,
    proveedorAcme,
    'Borrador',
    null,
    null,
    [
      {
        perfilTecnicoId: perfilDiseno,
        fechaInicio: '2026-05-01',
        fechaFin: '2026-07-31',
        horasOfertadas: 60,
        precioHora: 50,
        tarifaCongelada: false,
      },
    ],
  );

  // Pedido 2: EnEjecucion con tarifa congelada y consumos previos.
  const enEjecucion = crearPedidoDemo(
    proyectoMigracion,
    proveedorAcme,
    'EnEjecucion',
    '2025-12-15',
    '2025-12-20',
    [
      {
        perfilTecnicoId: perfilSenior,
        fechaInicio: '2026-01-01',
        fechaFin: '2026-04-30',
        horasOfertadas: 100,
        precioHora: 58,
        tarifaCongelada: true,
      },
      {
        perfilTecnicoId: perfilJunior,
        fechaInicio: '2026-01-01',
        fechaFin: '2026-04-30',
        horasOfertadas: 80,
        precioHora: 33,
        tarifaCongelada: true,
      },
    ],
  );

  const [lineaSenior, lineaJunior] = enEjecucion.lineaIds;
  const consumosDemo = [
    { lineaPedidoId: lineaSenior, recursoId: recursoAna, mes: 1, anio: 2026, horasConsumidas: 40 },
    { lineaPedidoId: lineaSenior, recursoId: recursoAna, mes: 2, anio: 2026, horasConsumidas: 40 },
    { lineaPedidoId: lineaJunior, recursoId: recursoLuis, mes: 1, anio: 2026, horasConsumidas: 30 },
    { lineaPedidoId: lineaJunior, recursoId: recursoLuis, mes: 2, anio: 2026, horasConsumidas: 30 },
  ];
  for (const consumo of consumosDemo) {
    db.insert(consumosMensuales).values(consumo).run();
  }

  // Pedido 3: Solicitado, pendiente de aprobación.
  crearPedidoDemo(
    proyectoAuditoria,
    proveedorBeta,
    'Solicitado',
    '2026-04-15',
    null,
    [
      {
        perfilTecnicoId: perfilPM,
        fechaInicio: '2026-04-01',
        fechaFin: '2026-06-30',
        horasOfertadas: 20,
        precioHora: 75,
        tarifaCongelada: false,
      },
    ],
  );
}

console.log('[db:seed] OK');
