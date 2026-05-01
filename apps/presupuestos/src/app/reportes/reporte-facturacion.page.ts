import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { ChartData, ChartOptions } from 'chart.js';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';

import { ICONOS } from '@operaciones/ui/iconos';
import { KpiTileComponent } from '@operaciones/ui/kpis';
import {
  type DensidadLista,
  EmptyStateComponent,
  ErrorStateComponent,
  ListPageComponent,
  ListToolbarComponent,
  LoadingStateComponent,
} from '@operaciones/ui/listado';
import { PageHeaderComponent } from '@operaciones/ui/shell';
import {
  defaultsParaChart,
  PALETA_PRE_CHART,
  PreChartComponent,
} from '@operaciones/ui/charts';

import { ProveedoresApi } from '../catalogo/catalogo.api';
import type { Proveedor } from '../catalogo/catalogo.types';
import {
  leerDensidadInicial,
  leerFilasInicial,
  persistirDensidad,
  persistirFilas,
} from '../listado-prefs';
import { ProyectosApi } from '../proyectos/proyectos.api';
import type { Proyecto } from '../proyectos/proyectos.types';
import { descargarCsv } from './descargar-csv';
import {
  formatearEnteroES,
  formatearImporte,
} from './reportes-format';
import { ReportesApi } from './reportes.api';
import type {
  FilaReporteFacturacion,
  ReporteFacturacionFiltros,
} from './reportes.types';

const SECCION = 'reporte-facturacion';

const MESES = [
  { value: 1, label: '01 — Enero' },
  { value: 2, label: '02 — Febrero' },
  { value: 3, label: '03 — Marzo' },
  { value: 4, label: '04 — Abril' },
  { value: 5, label: '05 — Mayo' },
  { value: 6, label: '06 — Junio' },
  { value: 7, label: '07 — Julio' },
  { value: 8, label: '08 — Agosto' },
  { value: 9, label: '09 — Septiembre' },
  { value: 10, label: '10 — Octubre' },
  { value: 11, label: '11 — Noviembre' },
  { value: 12, label: '12 — Diciembre' },
];

const NOMBRE_MES_CORTO: Record<number, string> = {
  1: 'Ene',
  2: 'Feb',
  3: 'Mar',
  4: 'Abr',
  5: 'May',
  6: 'Jun',
  7: 'Jul',
  8: 'Ago',
  9: 'Sep',
  10: 'Oct',
  11: 'Nov',
  12: 'Dic',
};

const NOMBRE_MES: Record<number, string> = Object.fromEntries(
  MESES.map((m) => [m.value, m.label]),
);

@Component({
  selector: 'app-reporte-facturacion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    SelectModule,
    InputNumberModule,
    ButtonModule,
    ListPageComponent,
    ListToolbarComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    KpiTileComponent,
    PreChartComponent,
  ],
  templateUrl: './reporte-facturacion.page.html',
  styleUrl: './reportes-base.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReporteFacturacionPage {
  private readonly api = inject(ReportesApi);
  private readonly proveedoresApi = inject(ProveedoresApi);
  private readonly proyectosApi = inject(ProyectosApi);
  private readonly toast = inject(MessageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly icono = ICONOS;
  protected readonly filas = signal<FilaReporteFacturacion[]>([]);
  protected readonly proveedores = signal<Proveedor[]>([]);
  protected readonly proyectos = signal<Proyecto[]>([]);
  protected readonly cargando = signal(false);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly meses = MESES;
  protected readonly expanded = signal<Record<string, boolean>>({});

  protected readonly densidad = signal<DensidadLista>(
    leerDensidadInicial(SECCION),
  );
  protected readonly filasPorPagina = signal<number>(leerFilasInicial(SECCION));

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly mesDesdeFiltro = computed(() =>
    leerNumero(this.queryParams().get('mesDesde')),
  );
  protected readonly anioDesdeFiltro = computed(() =>
    leerNumero(this.queryParams().get('anioDesde')),
  );
  protected readonly mesHastaFiltro = computed(() =>
    leerNumero(this.queryParams().get('mesHasta')),
  );
  protected readonly anioHastaFiltro = computed(() =>
    leerNumero(this.queryParams().get('anioHasta')),
  );
  protected readonly anioFiltro = computed(() =>
    leerNumero(this.queryParams().get('anio')),
  );
  protected readonly proveedorFiltro = computed(() =>
    leerNumero(this.queryParams().get('proveedor')),
  );
  protected readonly proyectoFiltro = computed(() =>
    leerNumero(this.queryParams().get('proyecto')),
  );

  protected readonly hayFiltrosActivos = computed(
    () =>
      this.mesDesdeFiltro() !== null ||
      this.anioDesdeFiltro() !== null ||
      this.mesHastaFiltro() !== null ||
      this.anioHastaFiltro() !== null ||
      this.anioFiltro() !== null ||
      this.proveedorFiltro() !== null ||
      this.proyectoFiltro() !== null,
  );

  protected readonly kpis = computed(() => {
    const filas = this.filas();
    const totalEur = filas.reduce((acc, f) => acc + f.totalEur, 0);
    const pedidoIds = new Set<number>();
    let mesPicoLabel: string | null = null;
    let mesPicoTotal = 0;
    let proveedorTopNombre: string | null = null;
    let proveedorTopTotal = 0;

    const acumPorMes = new Map<string, number>();
    const acumPorProveedor = new Map<string, number>();
    for (const f of filas) {
      for (const d of f.detalle) {
        pedidoIds.add(d.pedidoId);
      }
      const claveMes = `${f.anio}-${f.mes}`;
      acumPorMes.set(claveMes, (acumPorMes.get(claveMes) ?? 0) + f.totalEur);
      acumPorProveedor.set(
        f.proveedorNombre,
        (acumPorProveedor.get(f.proveedorNombre) ?? 0) + f.totalEur,
      );
    }
    for (const [clave, total] of acumPorMes) {
      if (total > mesPicoTotal) {
        mesPicoTotal = total;
        const [anio, mes] = clave.split('-').map(Number);
        mesPicoLabel = `${NOMBRE_MES_CORTO[mes]} ${anio}`;
      }
    }
    for (const [nombre, total] of acumPorProveedor) {
      if (total > proveedorTopTotal) {
        proveedorTopTotal = total;
        proveedorTopNombre = nombre;
      }
    }
    return {
      totalEur,
      pedidosFacturados: pedidoIds.size,
      mesPicoLabel,
      mesPicoTotal,
      proveedorTopNombre,
      proveedorTopTotal,
    };
  });

  protected readonly chartData = computed<ChartData>(() => {
    const filas = this.filas();
    const claves = new Set<string>();
    const proveedoresSet = new Set<string>();
    for (const f of filas) {
      claves.add(claveMesAnio(f.anio, f.mes));
      proveedoresSet.add(f.proveedorNombre);
    }
    const labels = Array.from(claves).sort(compararClaveMesAnio);
    const proveedores = Array.from(proveedoresSet).sort();
    const matriz = new Map<string, Map<string, number>>();
    for (const f of filas) {
      const k = claveMesAnio(f.anio, f.mes);
      const filaProv = matriz.get(k) ?? new Map<string, number>();
      filaProv.set(
        f.proveedorNombre,
        (filaProv.get(f.proveedorNombre) ?? 0) + f.totalEur,
      );
      matriz.set(k, filaProv);
    }
    return {
      labels: labels.map(formatearLabelMes),
      datasets: proveedores.map((nombre, idx) => ({
        label: nombre,
        data: labels.map((k) => matriz.get(k)?.get(nombre) ?? 0),
        backgroundColor: PALETA_PRE_CHART[idx % PALETA_PRE_CHART.length],
        borderWidth: 0,
      })),
    };
  });

  protected readonly chartOptions = computed<ChartOptions>(() =>
    defaultsParaChart({
      formatoEjeY: (v) => `${v} €`,
      formatoTooltip: ({ valor, datasetLabel }) =>
        `${datasetLabel ?? ''}: ${formatearImporte(valor)}`,
    }),
  );

  constructor() {
    this.cargarCatalogo();
    effect(() => {
      const filtros = this.filtrosActuales();
      this.aplicar(filtros);
    });
    effect(() => {
      persistirDensidad(SECCION, this.densidad());
    });
    effect(() => {
      persistirFilas(SECCION, this.filasPorPagina());
    });
  }

  formatearImporte = formatearImporte;
  formatearEnteroES = formatearEnteroES;

  protected onMesDesdeChange(valor: number | null): void {
    this.actualizarParam('mesDesde', valor ? String(valor) : null);
  }

  protected onAnioDesdeChange(valor: number | null): void {
    this.actualizarParam('anioDesde', valor ? String(valor) : null);
  }

  protected onMesHastaChange(valor: number | null): void {
    this.actualizarParam('mesHasta', valor ? String(valor) : null);
  }

  protected onAnioHastaChange(valor: number | null): void {
    this.actualizarParam('anioHasta', valor ? String(valor) : null);
  }

  protected onAnioChange(valor: number | null): void {
    this.actualizarParam('anio', valor ? String(valor) : null);
  }

  protected onProveedorChange(valor: number | null): void {
    this.actualizarParam('proveedor', valor ? String(valor) : null);
  }

  protected onProyectoChange(valor: number | null): void {
    this.actualizarParam('proyecto', valor ? String(valor) : null);
  }

  protected limpiarFiltros(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      queryParamsHandling: 'replace',
    });
  }

  protected onDensidadChange(d: DensidadLista): void {
    this.densidad.set(d);
  }

  protected onFilasChange(filas: number): void {
    this.filasPorPagina.set(filas);
  }

  protected reintentar(): void {
    this.aplicar(this.filtrosActuales());
  }

  protected exportarCsv(): void {
    this.api.facturacionCsv(this.filtrosActuales()).subscribe({
      next: (blob) => descargarCsv(blob, this.nombreCsv()),
      error: (err: HttpErrorResponse) => {
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo exportar',
          detail: err.message,
        });
      },
    });
  }

  protected toggleDetalle(fila: FilaReporteFacturacion): void {
    const key = this.claveFila(fila);
    this.expanded.update((m) => ({ ...m, [key]: !m[key] }));
  }

  protected estaExpandida(fila: FilaReporteFacturacion): boolean {
    return Boolean(this.expanded()[this.claveFila(fila)]);
  }

  protected nombreMes(mes: number): string {
    return NOMBRE_MES[mes] ?? String(mes);
  }

  private claveFila(fila: FilaReporteFacturacion): string {
    return `${fila.anio}-${fila.mes}-${fila.proveedorId}`;
  }

  private nombreCsv(): string {
    const a = this.anioFiltro();
    if (a) return `facturacion-${a}.csv`;
    const mDesde = this.mesDesdeFiltro();
    const aDesde = this.anioDesdeFiltro();
    if (aDesde && mDesde) {
      const mm = String(mDesde).padStart(2, '0');
      return `facturacion-${aDesde}-${mm}.csv`;
    }
    return 'facturacion.csv';
  }

  private actualizarParam(clave: string, valor: string | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [clave]: valor },
      queryParamsHandling: 'merge',
    });
  }

  private cargarCatalogo(): void {
    this.proveedoresApi
      .list()
      .subscribe({ next: (lista) => this.proveedores.set(lista) });
    this.proyectosApi
      .list()
      .subscribe({ next: (lista) => this.proyectos.set(lista) });
  }

  private aplicar(filtros: ReporteFacturacionFiltros): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.api.facturacion(filtros).subscribe({
      next: (filas) => {
        this.filas.set(filas);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorCarga.set(err.message);
      },
    });
  }

  private filtrosActuales(): ReporteFacturacionFiltros {
    return {
      mesDesde: this.mesDesdeFiltro() ?? undefined,
      anioDesde: this.anioDesdeFiltro() ?? undefined,
      mesHasta: this.mesHastaFiltro() ?? undefined,
      anioHasta: this.anioHastaFiltro() ?? undefined,
      anio: this.anioFiltro() ?? undefined,
      proveedorId: this.proveedorFiltro() ?? undefined,
      proyectoId: this.proyectoFiltro() ?? undefined,
    };
  }
}

function leerNumero(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function claveMesAnio(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}`;
}

function compararClaveMesAnio(a: string, b: string): number {
  return a.localeCompare(b);
}

function formatearLabelMes(clave: string): string {
  const [anio, mes] = clave.split('-').map(Number);
  return `${NOMBRE_MES_CORTO[mes]} ${anio}`;
}
