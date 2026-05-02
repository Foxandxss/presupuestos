import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';

import { mapearErrorACopy } from '@operaciones/ui/errores';
import {
  type DensidadLista,
  EmptyStateComponent,
  ErrorStateComponent,
  ListPageComponent,
  ListToolbarComponent,
  LoadingStateComponent,
} from '@operaciones/ui/listado';
import { PageHeaderComponent } from '@operaciones/ui/shell';

import { InicioApi } from '../home/inicio.api';
import {
  type AccionHistorialPedido,
  type ActividadEvento,
  TIPOS_ACTIVIDAD,
  type TipoActividad,
} from '../home/inicio.types';
import {
  leerDensidadInicial,
  leerFilasInicial,
  persistirDensidad,
  persistirFilas,
} from '../listado-prefs';
import { descargarCsv } from '../reportes/descargar-csv';

const SECCION = 'actividad';

const TIPOS_VALIDOS = new Set<TipoActividad>(TIPOS_ACTIVIDAD);

interface OpcionTipo {
  label: string;
  value: TipoActividad;
}

const OPCIONES_TIPO: OpcionTipo[] = [
  { label: 'Pedido creado', value: 'pedido_creado' },
  { label: 'Pedido transición', value: 'pedido_transicion' },
  { label: 'Consumo registrado', value: 'consumo_registrado' },
  { label: 'Consumo eliminado', value: 'consumo_eliminado' },
  { label: 'Proyecto creado', value: 'proyecto_creado' },
];

const TIPO_LABEL = new Map<TipoActividad, string>(
  OPCIONES_TIPO.map((o) => [o.value, o.label]),
);

const ACCION_LABEL: Record<AccionHistorialPedido, string> = {
  solicitar: 'Solicitar',
  aprobar: 'Aprobar',
  rechazar: 'Rechazar',
  cancelar: 'Cancelar',
  consumo_inicial: 'Primer consumo',
  consumo_completo: 'Líneas saturadas',
  consumo_borrado: 'Consumo borrado',
};

@Component({
  selector: 'app-actividad',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    MultiSelectModule,
    DatePickerModule,
    ButtonModule,
    ListPageComponent,
    ListToolbarComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
  ],
  templateUrl: './actividad.page.html',
  styleUrl: '../lista-base.css',
  styles: [
    `
      .pre-actividad__sub {
        color: var(--text-subtle);
        font-size: 12px;
        margin-left: 4px;
      }
      .pre-actividad__usuario-vacio {
        color: var(--text-subtle);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActividadPage {
  private readonly api = inject(InicioApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(MessageService);

  protected readonly opcionesTipo = OPCIONES_TIPO;

  protected readonly cargando = signal(false);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly exportando = signal(false);
  protected readonly total = signal(0);
  protected readonly items = signal<ActividadEvento[]>([]);

  protected readonly densidad = signal<DensidadLista>(
    leerDensidadInicial(SECCION),
  );
  protected readonly filasPorPagina = signal<number>(leerFilasInicial(SECCION));
  protected readonly first = signal<number>(0);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly tipoFiltro = computed<TipoActividad[]>(() => {
    const raw = this.queryParams().get('tipo');
    if (!raw) return [];
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is TipoActividad =>
        TIPOS_VALIDOS.has(s as TipoActividad),
      );
  });
  protected readonly desdeFiltro = computed<string | null>(
    () => this.queryParams().get('desde') ?? null,
  );
  protected readonly hastaFiltro = computed<string | null>(
    () => this.queryParams().get('hasta') ?? null,
  );
  protected readonly qFiltro = computed<string>(
    () => this.queryParams().get('q') ?? '',
  );

  protected readonly desdeDate = computed<Date | null>(() => {
    const raw = this.desdeFiltro();
    return raw ? new Date(raw) : null;
  });
  protected readonly hastaDate = computed<Date | null>(() => {
    const raw = this.hastaFiltro();
    return raw ? new Date(raw) : null;
  });

  protected readonly hayFiltrosActivos = computed(
    () =>
      this.tipoFiltro().length > 0 ||
      this.desdeFiltro() !== null ||
      this.hastaFiltro() !== null ||
      this.qFiltro() !== '',
  );

  protected readonly resumen = computed(() => {
    const t = this.total();
    if (t === 0) return null;
    const visibles = this.items().length;
    const inicio = this.first() + 1;
    const fin = this.first() + visibles;
    return `${inicio}-${fin} de ${t}`;
  });

  constructor() {
    effect(() => {
      // Refetch cuando cambian filtros, paginación o tamaño de página.
      const filtros = {
        tipo: this.tipoFiltro(),
        desde: this.desdeFiltro(),
        hasta: this.hastaFiltro(),
        q: this.qFiltro(),
        first: this.first(),
        rows: this.filasPorPagina(),
      };
      untracked(() => this.cargar(filtros));
    });
    effect(() => {
      persistirDensidad(SECCION, this.densidad());
    });
    effect(() => {
      persistirFilas(SECCION, this.filasPorPagina());
    });
  }

  protected etiquetaTipo(tipo: TipoActividad): string {
    return TIPO_LABEL.get(tipo) ?? tipo;
  }

  protected etiquetaAccion(accion: AccionHistorialPedido | null): string | null {
    if (!accion) return null;
    return ACCION_LABEL[accion] ?? accion;
  }

  protected formatearFecha(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const next = event.first ?? 0;
    if (next !== this.first()) this.first.set(next);
    const rows = event.rows;
    if (rows && rows !== this.filasPorPagina()) this.filasPorPagina.set(rows);
  }

  protected onTipoChange(valores: TipoActividad[]): void {
    const csv = valores.length ? valores.join(',') : null;
    this.first.set(0);
    this.actualizarParam('tipo', csv);
  }

  protected onDesdeChange(value: Date | null): void {
    this.first.set(0);
    this.actualizarParam('desde', value ? value.toISOString() : null);
  }

  protected onHastaChange(value: Date | null): void {
    this.first.set(0);
    if (value) {
      // hasta inclusivo: tomar el final del día seleccionado.
      const fin = new Date(value);
      fin.setHours(23, 59, 59, 999);
      this.actualizarParam('hasta', fin.toISOString());
    } else {
      this.actualizarParam('hasta', null);
    }
  }

  protected onQueryChange(valor: string): void {
    this.first.set(0);
    this.actualizarParam('q', valor.trim() === '' ? null : valor);
  }

  protected limpiarFiltros(): void {
    this.first.set(0);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      queryParamsHandling: 'replace',
    });
  }

  protected onDensidadChange(d: DensidadLista): void {
    this.densidad.set(d);
  }

  protected reintentar(): void {
    this.cargar({
      tipo: this.tipoFiltro(),
      desde: this.desdeFiltro(),
      hasta: this.hastaFiltro(),
      q: this.qFiltro(),
      first: this.first(),
      rows: this.filasPorPagina(),
    });
  }

  protected exportarCsv(): void {
    if (this.exportando()) return;
    this.exportando.set(true);
    this.api
      .actividadCsv({
        tipo: this.tipoFiltro().length > 0 ? this.tipoFiltro() : undefined,
        desde: this.desdeFiltro() ?? undefined,
        hasta: this.hastaFiltro() ?? undefined,
        q: this.qFiltro() || undefined,
      })
      .subscribe({
        next: (blob) => {
          descargarCsv(blob, 'actividad.csv');
          this.exportando.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.exportando.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'No se pudo exportar',
            detail: this.extraerCopyError(err),
          });
        },
      });
  }

  protected onClickEvento(evento: ActividadEvento): void {
    if (evento.recurso.tipo === 'pedido') {
      void this.router.navigate(['/pedidos', evento.recurso.id]);
    } else if (evento.recurso.tipo === 'proyecto') {
      void this.router.navigate(['/proyectos', evento.recurso.id]);
    } else {
      void this.router.navigate(['/consumos']);
    }
  }

  private actualizarParam(clave: string, valor: string | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [clave]: valor },
      queryParamsHandling: 'merge',
    });
  }

  private cargar(filtros: {
    tipo: readonly TipoActividad[];
    desde: string | null;
    hasta: string | null;
    q: string;
    first: number;
    rows: number;
  }): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.api
      .actividad({
        limit: filtros.rows,
        offset: filtros.first,
        tipo: filtros.tipo.length > 0 ? filtros.tipo : undefined,
        desde: filtros.desde ?? undefined,
        hasta: filtros.hasta ?? undefined,
        q: filtros.q || undefined,
      })
      .subscribe({
        next: (pagina) => {
          this.items.set(pagina.items);
          this.total.set(pagina.total);
          this.cargando.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.cargando.set(false);
          this.errorCarga.set(this.extraerCopyError(err));
        },
      });
  }

  private extraerCopyError(err: HttpErrorResponse): string {
    const body = err.error as
      | {
          code?: string;
          message?: string | string[];
          fields?: Record<string, unknown>;
        }
      | undefined;
    if (typeof body?.code === 'string' && typeof body.message === 'string') {
      return mapearErrorACopy({
        code: body.code,
        message: body.message,
        fields: body.fields,
      });
    }
    if (Array.isArray(body?.message)) return body.message.join(', ');
    if (typeof body?.message === 'string') return body.message;
    return err.message;
  }
}
