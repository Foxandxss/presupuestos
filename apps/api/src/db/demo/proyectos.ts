import type { AppDatabase } from '../connection';
import { estimacionesPerfil, proyectos } from '../schema';
import type { FakerEs } from './faker';

const NUM_PROYECTOS = 25;
const HOY = '2026-05-01';
const HORIZONTE_INICIO_ANIO = 2025;
const HORIZONTE_INICIO_MES = 5;
const MESES_HORIZONTE = 12;

const PROBABILIDAD_DESCRIPCION = 0.5;
const ESTIMACIONES_MIN = 2;
const ESTIMACIONES_MAX = 5;
const HORAS_MIN = 50;
const HORAS_MAX = 1500;
const HORAS_PASO = 10;

// Plantilla "Tema Enfoque Etiqueta": 10·10·10 = 1000 combos para 25 nombres
// únicos, lejos del límite de retries de faker.helpers.uniqueArray.
const TEMAS = [
  'Migración',
  'Portal',
  'Plataforma',
  'Auditoría',
  'Modernización',
  'Implantación',
  'Refactor',
  'Integración',
  'Despliegue',
  'Análisis',
];

const ENFOQUES = [
  'cliente',
  'corporativo',
  'comercial',
  'logístico',
  'financiero',
  'CRM',
  'ERP',
  'web',
  'datos',
  'cloud',
];

const ETIQUETAS = [
  'Norte',
  'Sur',
  'Iberia',
  'Mediterráneo',
  'Cantábrico',
  'Q1 2026',
  'Q2 2026',
  'Fase 1',
  'Fase 2',
  'Piloto',
];

// `es` no trae `lorem` y no quiero arrastrar fallbacks `en/base` en el wrapper
// sólo por las descripciones — un pool curado deja la UI 100% en castellano.
const DESCRIPCIONES = [
  'Modernización de la plataforma corporativa con migración a microservicios.',
  'Implantación del nuevo CRM y formación del equipo comercial.',
  'Auditoría externa de seguridad sobre los sistemas críticos de negocio.',
  'Refactor del backend de facturación para reducir tiempos de cierre mensual.',
  'Despliegue de un portal de autoservicio para clientes corporativos.',
  'Integración con el ERP del grupo y consolidación de maestros.',
  'Análisis de viabilidad y prueba de concepto para la nueva línea de producto.',
  'Migración del data warehouse a una solución cloud-native.',
  'Implantación del módulo de RRHH y conexión con la herramienta de nómina.',
  'Renovación tecnológica de la red interna y los servicios de mensajería.',
  'Adaptación regulatoria y refuerzo de los controles de cumplimiento.',
  'Desarrollo del MVP del nuevo canal digital para la división retail.',
  'Optimización del rendimiento de la pasarela de pagos en horas pico.',
  'Migración de la mensajería interna a una plataforma unificada.',
  'Rediseño de la experiencia de usuario en el área privada del portal.',
];

export interface ProyectosSembrados {
  proyectosIds: number[];
}

export function sembrarProyectos(
  db: AppDatabase,
  faker: FakerEs,
  perfilesIds: number[],
): ProyectosSembrados {
  const nombres = faker.helpers.uniqueArray(
    () =>
      `${faker.helpers.arrayElement(TEMAS)} ${faker.helpers.arrayElement(
        ENFOQUES,
      )} ${faker.helpers.arrayElement(ETIQUETAS)}`,
    NUM_PROYECTOS,
  );

  const proyectosIds: number[] = [];
  for (let i = 0; i < NUM_PROYECTOS; i++) {
    const offsetMeses = Math.floor((i * MESES_HORIZONTE) / NUM_PROYECTOS);
    const fechaInicio = generarFechaInicio(faker, offsetMeses);
    const fechaFin = decidirFechaFin(faker, fechaInicio);
    const descripcion =
      faker.number.float({ min: 0, max: 1 }) < PROBABILIDAD_DESCRIPCION
        ? faker.helpers.arrayElement(DESCRIPCIONES)
        : null;

    const [row] = db
      .insert(proyectos)
      .values({ nombre: nombres[i], fechaInicio, fechaFin, descripcion })
      .returning({ id: proyectos.id })
      .all();
    proyectosIds.push(row.id);
  }

  for (const proyectoId of proyectosIds) {
    const cuantos = faker.number.int({
      min: ESTIMACIONES_MIN,
      max: ESTIMACIONES_MAX,
    });
    // arrayElements muestrea sin reemplazo, así que el UNIQUE
    // (proyectoId, perfilTecnicoId) queda garantizado dentro del proyecto.
    // Sort posterior fija el orden de inserción para que los IDs sean estables.
    const perfiles = [...faker.helpers.arrayElements(perfilesIds, cuantos)].sort(
      (a, b) => a - b,
    );
    for (const perfilTecnicoId of perfiles) {
      const horasEstimadas =
        faker.number.int({
          min: HORAS_MIN / HORAS_PASO,
          max: HORAS_MAX / HORAS_PASO,
        }) * HORAS_PASO;
      db.insert(estimacionesPerfil)
        .values({ proyectoId, perfilTecnicoId, horasEstimadas })
        .run();
    }
  }

  return { proyectosIds };
}

function generarFechaInicio(faker: FakerEs, offsetMeses: number): string {
  const { anio, mes } = sumarMeses(
    HORIZONTE_INICIO_ANIO,
    HORIZONTE_INICIO_MES,
    offsetMeses,
  );
  const dia = faker.number.int({ min: 1, max: ultimoDiaDeMes(anio, mes) });
  return formatFecha(anio, mes, dia);
}

function decidirFechaFin(faker: FakerEs, fechaInicio: string): string | null {
  const mesesDesdeInicio = mesesEntreFechas(fechaInicio, HOY);
  // Proyectos antiguos (≥ 8 meses de antigüedad) suelen tener fecha fin;
  // los recientes (< 4 meses) raramente la llevan.
  const probabilidad =
    mesesDesdeInicio >= 8 ? 0.85 : mesesDesdeInicio >= 4 ? 0.5 : 0.15;
  if (faker.number.float({ min: 0, max: 1 }) >= probabilidad) return null;

  const duracionMeses = faker.number.int({ min: 1, max: 12 });
  const [anioInicio, mesInicio] = parsearFecha(fechaInicio);
  const { anio, mes } = sumarMeses(anioInicio, mesInicio, duracionMeses);
  const dia = faker.number.int({ min: 1, max: ultimoDiaDeMes(anio, mes) });
  return formatFecha(anio, mes, dia);
}

function sumarMeses(
  anio: number,
  mes: number,
  offset: number,
): { anio: number; mes: number } {
  const total = anio * 12 + (mes - 1) + offset;
  return { anio: Math.floor(total / 12), mes: (total % 12) + 1 };
}

function ultimoDiaDeMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

function mesesEntreFechas(desde: string, hasta: string): number {
  const [a1, m1] = parsearFecha(desde);
  const [a2, m2] = parsearFecha(hasta);
  return (a2 - a1) * 12 + (m2 - m1);
}

function parsearFecha(fecha: string): [number, number, number] {
  const [a, m, d] = fecha.split('-').map(Number);
  return [a, m, d];
}

function formatFecha(anio: number, mes: number, dia: number): string {
  return `${anio}-${pad2(mes)}-${pad2(dia)}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
