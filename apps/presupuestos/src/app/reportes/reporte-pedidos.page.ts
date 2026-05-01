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

import {
  etiquetaEstadoPedido,
  StatusBadgeComponent,
} from '@operaciones/ui/estados-pedido';
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

import {
  leerDensidadInicial,
  leerFilasInicial,
  persistirDensidad,
  persistirFilas,
} from '../listado-prefs';
import { ProveedoresApi } from '../catalogo/catalogo.api';
import type { Proveedor } from '../catalogo/catalogo.types';
import type { EstadoPedido } from '../pedidos/pedidos.types';
import { ProyectosApi } from '../proyectos/proyectos.api';
import type { Proyecto } from '../proyectos/proyectos.types';
import { descargarCsv } from './descargar-csv';
import {
  formatearEnteroES,
  formatearHoras,
  formatearImporte,
} from './reportes-format';
import { ReportesApi } from './reportes.api';
import type {
  FilaReportePedido,
  ReportePedidosFiltros,
} from './reportes.types';

const SECCION = 'reporte-pedidos';

const ESTADOS_OPCIONES: { label: string; value: EstadoPedido }[] = (
  [
    'Borrador',
    'Solicitado',
    'Aprobado',
    'EnEjecucion',
    'Consumido',
    'Rechazado',
    'Cancelado',
  ] as const
).map((e) => ({ label: etiquetaEstadoPedido(e), value: e }));

const ESTADOS_VALIDOS = new Set<EstadoPedido>(
  ESTADOS_OPCIONES.map((o) => o.value),
);

const COLORES_ESTADO: Record<EstadoPedido, string> = {
  Borrador: '#94a3b8',
  Solicitado: '#f59e0b',
  Aprobado: '#0ea5e9',
  EnEjecucion: '#10b981',
  Consumido: '#047857',
  Rechazado: '#ef4444',
  Cancelado: '#64748b',
};

@Component({
  selector: 'app-reporte-pedidos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    SelectModule,
    ButtonModule,
    StatusBadgeComponent,
    ListPageComponent,
    ListToolbarComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    KpiTileComponent,
    PreChartComponent,
  ],
  templateUrl: './reporte-pedidos.page.html',
  styleUrl: './reportes-base.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportePedidosPage {
  private readonly api = inject(ReportesApi);
  private readonly proveedoresApi = inject(ProveedoresApi);
  private readonly proyectosApi = inject(ProyectosApi);
  private readonly toast = inject(MessageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly icono = ICONOS;
  protected readonly filas = signal<FilaReportePedido[]>([]);
  protected readonly proveedores = signal<Proveedor[]>([]);
  protected readonly proyectos = signal<Proyecto[]>([]);
  protected readonly cargando = signal(false);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly estadosOpciones = ESTADOS_OPCIONES;

  protected readonly densidad = signal<DensidadLista>(
    leerDensidadInicial(SECCION),
  );
  protected readonly filasPorPagina = signal<number>(leerFilasInicial(SECCION));

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly estadoFiltro = computed<EstadoPedido | null>(() => {
    const raw = this.queryParams().get('estado');
    if (!raw) return null;
    return ESTADOS_VALIDOS.has(raw as EstadoPedido)
      ? (raw as EstadoPedido)
      : null;
  });
  protected readonly proveedorFiltro = computed<number | null>(() => {
    const raw = this.queryParams().get('proveedor');
    const n = raw ? Number(raw) : null;
    return n && Number.isFinite(n) ? n : null;
  });
  protected readonly proyectoFiltro = computed<number | null>(() => {
    const raw = this.queryParams().get('proyecto');
    const n = raw ? Number(raw) : null;
    return n && Number.isFinite(n) ? n : null;
  });

  protected readonly hayFiltrosActivos = computed(
    () =>
      this.estadoFiltro() !== null ||
      this.proveedorFiltro() !== null ||
      this.proyectoFiltro() !== null,
  );

  protected readonly kpis = computed(() => {
    const filas = this.filas();
    const total = filas.length;
    const enEjecucion = filas.filter((f) => f.estado === 'EnEjecucion').length;
    const horasOfertadas = filas.reduce(
      (acc, f) => acc + f.totalHorasOfertadas,
      0,
    );
    const importeConsumido = filas.reduce(
      (acc, f) => acc + f.importeTotal,
      0,
    );
    return {
      total,
      enEjecucion,
      horasOfertadas,
      importeConsumido,
    };
  });

  protected readonly chartData = computed<ChartData>(() => {
    const filas = this.filas();
    const conteo = new Map<EstadoPedido, number>();
    for (const f of filas) {
      conteo.set(f.estado, (conteo.get(f.estado) ?? 0) + 1);
    }
    const ordenados = ESTADOS_OPCIONES.filter(
      (o) => (conteo.get(o.value) ?? 0) > 0,
    );
    return {
      labels: ordenados.map((o) => o.label),
      datasets: [
        {
          data: ordenados.map((o) => conteo.get(o.value) ?? 0),
          backgroundColor: ordenados.map((o) => COLORES_ESTADO[o.value]),
          borderWidth: 0,
        },
      ],
    };
  });

  protected readonly chartOptions = computed<ChartOptions>(() =>
    defaultsParaChart({ ejes: 'ninguno' }),
  );

  protected readonly paleta = PALETA_PRE_CHART;

  constructor() {
    this.cargarCatalogo();
    effect(() => {
      // Re-fetch reporte cuando cambian los filtros de URL.
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
  formatearHoras = formatearHoras;
  formatearEnteroES = formatearEnteroES;
  etiquetaEstado = etiquetaEstadoPedido;

  protected onEstadoChange(valor: EstadoPedido | null): void {
    this.actualizarParam('estado', valor ?? null);
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
    this.api.pedidosCsv(this.filtrosActuales()).subscribe({
      next: (blob) => descargarCsv(blob, 'reporte-pedidos.csv'),
      error: (err: HttpErrorResponse) => {
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo exportar',
          detail: err.message,
        });
      },
    });
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

  private aplicar(filtros: ReportePedidosFiltros): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.api.pedidos(filtros).subscribe({
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

  private filtrosActuales(): ReportePedidosFiltros {
    return {
      estado: this.estadoFiltro() ?? undefined,
      proveedorId: this.proveedorFiltro() ?? undefined,
      proyectoId: this.proyectoFiltro() ?? undefined,
    };
  }
}

