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
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { forkJoin } from 'rxjs';

import { Rol } from '@operaciones/dominio';
import { PreConfirm } from '@operaciones/ui/dialogos';
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

import { PreIfRolDirective } from '../auth/pre-if-rol.directive';
import {
  PerfilesTecnicosApi,
  ProveedoresApi,
  RecursosApi,
} from '../catalogo/catalogo.api';
import type {
  PerfilTecnico,
  Proveedor,
  Recurso,
} from '../catalogo/catalogo.types';
import {
  leerDensidadInicial,
  leerFilasInicial,
  persistirDensidad,
  persistirFilas,
} from '../listado-prefs';
import { PedidosApi } from '../pedidos/pedidos.api';
import type { LineaPedido, Pedido } from '../pedidos/pedidos.types';
import { ConsumoDrawerComponent } from './consumo-drawer.component';
import { ConsumosApi } from './consumos.api';
import type { Consumo } from './consumos.types';

const SECCION = 'consumos';

const ESTADOS_PEDIDO_CONSUMIBLES = new Set<Pedido['estado']>([
  'Aprobado',
  'EnEjecucion',
]);

interface OpcionPedido {
  id: number;
  label: string;
  proveedorId: number;
  estado: Pedido['estado'];
}

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

@Component({
  selector: 'app-consumos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputNumberModule,
    SelectModule,
    TagModule,
    ListPageComponent,
    ListToolbarComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    PreIfRolDirective,
    ConsumoDrawerComponent,
  ],
  templateUrl: './consumos.page.html',
  styleUrl: '../lista-base.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsumosPage {
  private readonly api = inject(ConsumosApi);
  private readonly pedidosApi = inject(PedidosApi);
  private readonly recursosApi = inject(RecursosApi);
  private readonly proveedoresApi = inject(ProveedoresApi);
  private readonly perfilesApi = inject(PerfilesTecnicosApi);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(PreConfirm);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly Rol = Rol;
  protected readonly meses = MESES;
  protected readonly consumos = signal<Consumo[]>([]);
  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly recursos = signal<Recurso[]>([]);
  protected readonly proveedores = signal<Proveedor[]>([]);
  protected readonly perfiles = signal<PerfilTecnico[]>([]);
  protected readonly cargando = signal(false);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly drawerAbierto = signal(false);

  protected readonly densidad = signal<DensidadLista>(leerDensidadInicial(SECCION));
  protected readonly filasPorPagina = signal<number>(leerFilasInicial(SECCION));

  protected readonly pedidosPorId = computed(() => {
    const map = new Map<number, Pedido>();
    for (const p of this.pedidos()) map.set(p.id, p);
    return map;
  });

  protected readonly recursosPorId = computed(() => {
    const map = new Map<number, string>();
    for (const r of this.recursos()) map.set(r.id, r.nombre);
    return map;
  });

  protected readonly proveedoresPorId = computed(() => {
    const map = new Map<number, string>();
    for (const p of this.proveedores()) map.set(p.id, p.nombre);
    return map;
  });

  protected readonly perfilesPorId = computed(() => {
    const map = new Map<number, string>();
    for (const p of this.perfiles()) map.set(p.id, p.nombre);
    return map;
  });

  protected readonly opcionesPedido = computed<OpcionPedido[]>(() => {
    const provs = this.proveedoresPorId();
    return this.pedidos()
      .filter((p) => ESTADOS_PEDIDO_CONSUMIBLES.has(p.estado))
      .map((p) => ({
        id: p.id,
        proveedorId: p.proveedorId,
        estado: p.estado,
        label: `#${p.id} · ${provs.get(p.proveedorId) ?? '?'} · ${p.estado}`,
      }));
  });

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly pedidoFiltro = computed<number | null>(() => {
    const raw = this.queryParams().get('pedido');
    const n = raw ? Number(raw) : null;
    return n && Number.isFinite(n) ? n : null;
  });
  protected readonly recursoFiltro = computed<number | null>(() => {
    const raw = this.queryParams().get('recurso');
    const n = raw ? Number(raw) : null;
    return n && Number.isFinite(n) ? n : null;
  });
  protected readonly mesFiltro = computed<number | null>(() => {
    const raw = this.queryParams().get('mes');
    const n = raw ? Number(raw) : null;
    return n && Number.isFinite(n) && n >= 1 && n <= 12 ? n : null;
  });
  protected readonly anioFiltro = computed<number | null>(() => {
    const raw = this.queryParams().get('anio');
    const n = raw ? Number(raw) : null;
    return n && Number.isFinite(n) ? n : null;
  });

  protected readonly hayFiltrosActivos = computed(
    () =>
      this.pedidoFiltro() !== null ||
      this.recursoFiltro() !== null ||
      this.mesFiltro() !== null ||
      this.anioFiltro() !== null,
  );

  protected readonly consumosFiltrados = computed(() => {
    const lista = this.consumos();
    const pedidoId = this.pedidoFiltro();
    const recursoId = this.recursoFiltro();
    const mes = this.mesFiltro();
    const anio = this.anioFiltro();
    return lista.filter((c) => {
      if (pedidoId !== null && c.pedidoId !== pedidoId) return false;
      if (recursoId !== null && c.recursoId !== recursoId) return false;
      if (mes !== null && c.mes !== mes) return false;
      if (anio !== null && c.anio !== anio) return false;
      return true;
    });
  });

  protected readonly resumen = computed(() => {
    const total = this.consumos().length;
    const visibles = this.consumosFiltrados().length;
    if (total === 0 || !this.hayFiltrosActivos()) return null;
    return `Mostrando ${visibles} de ${total}`;
  });

  constructor() {
    this.cargar();
    effect(() => persistirDensidad(SECCION, this.densidad()));
    effect(() => persistirFilas(SECCION, this.filasPorPagina()));
  }

  nombrePedido(id: number): string {
    const pedido = this.pedidosPorId().get(id);
    if (!pedido) return `#${id}`;
    return `#${pedido.id} · ${this.proveedoresPorId().get(pedido.proveedorId) ?? '?'}`;
  }

  nombreRecurso(id: number): string {
    return this.recursosPorId().get(id) ?? `#${id}`;
  }

  perfilDeLinea(consumo: Consumo): string {
    const pedido = this.pedidosPorId().get(consumo.pedidoId);
    const linea: LineaPedido | undefined = pedido?.lineas.find(
      (l) => l.id === consumo.lineaPedidoId,
    );
    if (!linea) return `Línea #${consumo.lineaPedidoId}`;
    return this.perfilesPorId().get(linea.perfilTecnicoId) ?? '?';
  }

  protected onPedidoFiltroChange(valor: number | null): void {
    this.actualizarParam('pedido', valor ? String(valor) : null);
  }
  protected onRecursoFiltroChange(valor: number | null): void {
    this.actualizarParam('recurso', valor ? String(valor) : null);
  }
  protected onMesFiltroChange(valor: number | null): void {
    this.actualizarParam('mes', valor ? String(valor) : null);
  }
  protected onAnioFiltroChange(valor: number | null): void {
    this.actualizarParam('anio', valor ? String(valor) : null);
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

  protected reintentarCarga(): void {
    this.cargar();
  }

  protected onRowClick(row: Consumo): void {
    // Placeholder: el drawer de detalle/edicion de Consumo llega en #26.
    // El drawer actual (pre-consumo-drawer) es solo de registro.
    void row;
  }

  private actualizarParam(clave: string, valor: string | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [clave]: valor },
      queryParamsHandling: 'merge',
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    forkJoin({
      consumos: this.api.list(),
      pedidos: this.pedidosApi.list(),
      recursos: this.recursosApi.list(),
      proveedores: this.proveedoresApi.list(),
      perfiles: this.perfilesApi.list(),
    }).subscribe({
      next: ({ consumos, pedidos, recursos, proveedores, perfiles }) => {
        this.consumos.set(consumos);
        this.pedidos.set(pedidos);
        this.recursos.set(recursos);
        this.proveedores.set(proveedores);
        this.perfiles.set(perfiles);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorCarga.set(extraerMensaje(err));
      },
    });
  }

  protected abrirDrawer(): void {
    this.drawerAbierto.set(true);
  }

  protected cerrarDrawer(): void {
    this.drawerAbierto.set(false);
  }

  protected onConsumoRegistrado(consumo: Consumo): void {
    this.consumos.update((lista) => [...lista, consumo]);
    this.toast.add({
      severity: 'success',
      summary: 'Consumo registrado',
    });
  }

  async eliminar(row: Consumo): Promise<void> {
    const ok = await this.confirm.destructivo({
      titulo: 'Eliminar consumo',
      mensaje: `¿Eliminar el consumo del ${row.mes}/${row.anio} de la línea #${row.lineaPedidoId}? Esta acción es irreversible.`,
      accionLabel: 'Eliminar consumo',
    });
    if (!ok) return;
    this.api.delete(row.id).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: 'Consumo eliminado',
        });
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo eliminar',
          detail: extraerMensaje(err),
        });
      },
    });
  }
}

function extraerMensaje(err: HttpErrorResponse): string {
  const body = err.error as
    | { code?: string; message?: string | string[]; fields?: Record<string, unknown> }
    | undefined;
  if (typeof body?.code === 'string' && typeof body.message === 'string') {
    return mapearErrorACopy({
      code: body.code,
      message: body.message,
      fields: body.fields,
    });
  }
  if (Array.isArray(body?.message)) {
    return body.message.join(', ');
  }
  if (typeof body?.message === 'string') {
    return body.message;
  }
  return err.message;
}
