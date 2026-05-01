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
  PreChartComponent,
} from '@operaciones/ui/charts';

import {
  PerfilesTecnicosApi,
  ProveedoresApi,
} from '../catalogo/catalogo.api';
import type { PerfilTecnico, Proveedor } from '../catalogo/catalogo.types';
import {
  leerDensidadInicial,
  leerFilasInicial,
  persistirDensidad,
  persistirFilas,
} from '../listado-prefs';
import { ProyectosApi } from '../proyectos/proyectos.api';
import type { Proyecto } from '../proyectos/proyectos.types';
import { descargarCsv } from './descargar-csv';
import { formatearHoras } from './reportes-format';
import { ReportesApi } from './reportes.api';
import type {
  DesgloseHoras,
  FilaReporteHoras,
  ReporteHorasFiltros,
} from './reportes.types';

const SECCION = 'reporte-horas';

const DESGLOSES: { label: string; value: DesgloseHoras }[] = [
  { value: 'proyecto-perfil', label: 'Proyecto + Perfil' },
  { value: 'perfil', label: 'Perfil (cross-proyecto)' },
  { value: 'proveedor', label: 'Proveedor' },
];

const DESGLOSES_VALIDOS = new Set<DesgloseHoras>(
  DESGLOSES.map((d) => d.value),
);

const COLOR_ESTIMADAS = '#a855f7'; // purple-500
const COLOR_OFERTADAS = '#7c3aed'; // violet-600
const COLOR_CONSUMIDAS = '#10b981'; // emerald-500
const COLOR_PENDIENTES = '#f59e0b'; // amber-500

@Component({
  selector: 'app-reporte-horas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    SelectModule,
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
  templateUrl: './reporte-horas.page.html',
  styleUrl: './reportes-base.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReporteHorasPage {
  private readonly api = inject(ReportesApi);
  private readonly proveedoresApi = inject(ProveedoresApi);
  private readonly perfilesApi = inject(PerfilesTecnicosApi);
  private readonly proyectosApi = inject(ProyectosApi);
  private readonly toast = inject(MessageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly icono = ICONOS;
  protected readonly filas = signal<FilaReporteHoras[]>([]);
  protected readonly proveedores = signal<Proveedor[]>([]);
  protected readonly perfiles = signal<PerfilTecnico[]>([]);
  protected readonly proyectos = signal<Proyecto[]>([]);
  protected readonly cargando = signal(false);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly desglosesOpciones = DESGLOSES;

  protected readonly densidad = signal<DensidadLista>(
    leerDensidadInicial(SECCION),
  );
  protected readonly filasPorPagina = signal<number>(leerFilasInicial(SECCION));

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly desglose = computed<DesgloseHoras>(() => {
    const raw = this.queryParams().get('desglose');
    if (raw && DESGLOSES_VALIDOS.has(raw as DesgloseHoras)) {
      return raw as DesgloseHoras;
    }
    return 'proyecto-perfil';
  });
  protected readonly proyectoFiltro = computed<number | null>(() =>
    leerNumero(this.queryParams().get('proyecto')),
  );
  protected readonly proveedorFiltro = computed<number | null>(() =>
    leerNumero(this.queryParams().get('proveedor')),
  );
  protected readonly perfilFiltro = computed<number | null>(() =>
    leerNumero(this.queryParams().get('perfil')),
  );

  protected readonly hayFiltrosActivos = computed(
    () =>
      this.proyectoFiltro() !== null ||
      this.proveedorFiltro() !== null ||
      this.perfilFiltro() !== null ||
      this.desglose() !== 'proyecto-perfil',
  );

  protected readonly kpis = computed(() => {
    const filas = this.filas();
    return {
      estimadas: filas.reduce((acc, f) => acc + f.horasEstimadas, 0),
      ofertadas: filas.reduce((acc, f) => acc + f.horasOfertadas, 0),
      consumidas: filas.reduce((acc, f) => acc + f.horasConsumidas, 0),
      pendientes: filas.reduce((acc, f) => acc + f.horasPendientes, 0),
    };
  });

  protected readonly chartData = computed<ChartData>(() => {
    const filas = this.filas();
    const desglose = this.desglose();
    const labels = filas.map((f) => labelDesglose(f, desglose));
    return {
      labels,
      datasets: [
        {
          label: 'Estimadas',
          data: filas.map((f) => f.horasEstimadas),
          backgroundColor: COLOR_ESTIMADAS,
          borderWidth: 0,
        },
        {
          label: 'Ofertadas',
          data: filas.map((f) => f.horasOfertadas),
          backgroundColor: COLOR_OFERTADAS,
          borderWidth: 0,
        },
        {
          label: 'Consumidas',
          data: filas.map((f) => f.horasConsumidas),
          backgroundColor: COLOR_CONSUMIDAS,
          borderWidth: 0,
        },
        {
          label: 'Pendientes',
          data: filas.map((f) => f.horasPendientes),
          backgroundColor: COLOR_PENDIENTES,
          borderWidth: 0,
        },
      ],
    };
  });

  protected readonly chartOptions = computed<ChartOptions>(() =>
    defaultsParaChart({
      stacked: true,
      indexAxis: 'y',
      formatoEjeY: (v) => String(v),
      formatoTooltip: ({ valor, datasetLabel }) =>
        `${datasetLabel ?? ''}: ${formatearHoras(valor)}`,
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

  formatearHoras = formatearHoras;

  protected onDesgloseChange(valor: DesgloseHoras | null): void {
    this.actualizarParam(
      'desglose',
      valor && valor !== 'proyecto-perfil' ? valor : null,
    );
  }

  protected onProyectoChange(valor: number | null): void {
    this.actualizarParam('proyecto', valor ? String(valor) : null);
  }

  protected onProveedorChange(valor: number | null): void {
    this.actualizarParam('proveedor', valor ? String(valor) : null);
  }

  protected onPerfilChange(valor: number | null): void {
    this.actualizarParam('perfil', valor ? String(valor) : null);
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
    this.api.horasCsv(this.filtrosActuales()).subscribe({
      next: (blob) => descargarCsv(blob, 'reporte-horas.csv'),
      error: (err: HttpErrorResponse) => {
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo exportar',
          detail: err.message,
        });
      },
    });
  }

  protected labelFila(fila: FilaReporteHoras): string {
    return labelDesglose(fila, this.desglose());
  }

  protected get alturaChart(): number {
    const n = this.filas().length;
    return Math.max(220, Math.min(640, 80 + n * 32));
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
    this.perfilesApi
      .list()
      .subscribe({ next: (lista) => this.perfiles.set(lista) });
    this.proyectosApi
      .list()
      .subscribe({ next: (lista) => this.proyectos.set(lista) });
  }

  private aplicar(filtros: ReporteHorasFiltros): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.api.horas(filtros).subscribe({
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

  private filtrosActuales(): ReporteHorasFiltros {
    return {
      proyectoId: this.proyectoFiltro() ?? undefined,
      proveedorId: this.proveedorFiltro() ?? undefined,
      perfilTecnicoId: this.perfilFiltro() ?? undefined,
      desglose: this.desglose(),
    };
  }
}

function leerNumero(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function labelDesglose(
  fila: FilaReporteHoras,
  desglose: DesgloseHoras,
): string {
  if (desglose === 'proveedor') {
    return fila.proveedorNombre ?? 'Sin proveedor';
  }
  if (desglose === 'perfil') {
    return fila.perfilTecnicoNombre ?? 'Sin perfil';
  }
  // proyecto-perfil
  const proyecto = fila.proyectoNombre ?? 'Sin proyecto';
  const perfil = fila.perfilTecnicoNombre ?? 'Sin perfil';
  return `${proyecto} · ${perfil}`;
}
