import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { forkJoin } from 'rxjs';

import { Rol } from '@operaciones/dominio';
import { PreConfirm } from '@operaciones/ui/dialogos';
import { mapearErrorACopy } from '@operaciones/ui/errores';
import {
  etiquetaEstadoPedido,
  formatearFechaCorta,
  StatusBadgeComponent,
  StatusTimelineComponent,
} from '@operaciones/ui/estados-pedido';
import { ErrorStateComponent, LoadingStateComponent } from '@operaciones/ui/listado';

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
import { ConsumoDrawerComponent } from '../consumos/consumo-drawer.component';
import { ConsumosApi } from '../consumos/consumos.api';
import type { Consumo } from '../consumos/consumos.types';
import { ProyectosApi } from '../proyectos/proyectos.api';
import type { Proyecto } from '../proyectos/proyectos.types';

import { PedidosApi } from './pedidos.api';
import type {
  AccionHistorialPedido,
  AccionPedido,
  EstadoPedido,
  HistorialPedido,
  LineaPedido,
  Pedido,
} from './pedidos.types';

interface HistorialFila {
  id: number;
  fecha: string;
  fechaCorta: string | null;
  estadoAnterior: string;
  estadoNuevo: string;
  accionLabel: string;
}

const ACCIONES_HISTORIAL_LABEL: Record<AccionHistorialPedido, string> = {
  solicitar: 'Solicitar',
  aprobar: 'Aprobar',
  rechazar: 'Rechazar',
  cancelar: 'Cancelar',
  consumo_inicial: 'Primer consumo',
  consumo_completo: 'Líneas saturadas',
  consumo_borrado: 'Consumo borrado',
};

const ESTADOS_TERMINALES: ReadonlySet<EstadoPedido> = new Set([
  'Rechazado',
  'Cancelado',
]);

interface AccionPrimaria {
  accion: AccionPedido;
  label: string;
  icon: string;
  severity: 'primary' | 'success';
}

interface AccionDestructiva {
  accion: AccionPedido;
  label: string;
  icon: string;
}

const ACCION_PRIMARIA: Partial<Record<EstadoPedido, AccionPrimaria>> = {
  Borrador: {
    accion: 'solicitar',
    label: 'Solicitar',
    icon: 'pi pi-send',
    severity: 'primary',
  },
  Solicitado: {
    accion: 'aprobar',
    label: 'Aprobar',
    icon: 'pi pi-check',
    severity: 'success',
  },
};

const ACCIONES_DESTRUCTIVAS: Partial<Record<EstadoPedido, AccionDestructiva>> =
  {
    Solicitado: {
      accion: 'rechazar',
      label: 'Rechazar',
      icon: 'pi pi-times',
    },
    Aprobado: {
      accion: 'cancelar',
      label: 'Cancelar',
      icon: 'pi pi-ban',
    },
    EnEjecucion: {
      accion: 'cancelar',
      label: 'Cancelar',
      icon: 'pi pi-ban',
    },
  };

const MENSAJES_ESPERA: Partial<Record<EstadoPedido, string>> = {
  Aprobado: 'Esperando registro de consumo.',
  EnEjecucion: 'Esperando completar todas las líneas.',
};

const PEDIDOS_CONSUMIBLES: ReadonlySet<EstadoPedido> = new Set([
  'Aprobado',
  'EnEjecucion',
]);

@Component({
  selector: 'app-pedido-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TableModule,
    ButtonModule,
    ToastModule,
    StatusBadgeComponent,
    StatusTimelineComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PreIfRolDirective,
    ConsumoDrawerComponent,
  ],
  templateUrl: './pedido-detail.page.html',
  styleUrl: './pedido-detail.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(PedidosApi);
  private readonly consumosApi = inject(ConsumosApi);
  private readonly proyectosApi = inject(ProyectosApi);
  private readonly proveedoresApi = inject(ProveedoresApi);
  private readonly perfilesApi = inject(PerfilesTecnicosApi);
  private readonly recursosApi = inject(RecursosApi);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(PreConfirm);

  protected readonly Rol = Rol;

  protected readonly pedido = signal<Pedido | null>(null);
  protected readonly consumos = signal<Consumo[]>([]);
  protected readonly proyecto = signal<Proyecto | null>(null);
  protected readonly proveedor = signal<Proveedor | null>(null);
  protected readonly perfiles = signal<PerfilTecnico[]>([]);
  protected readonly recursos = signal<Recurso[]>([]);

  protected readonly cargando = signal(false);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly noEncontrado = signal(false);
  protected readonly drawerAbierto = signal(false);

  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  protected readonly idPedido = computed<number | null>(() => {
    const raw = this.paramMap().get('id');
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  });

  protected readonly perfilesPorId = computed(() => {
    const map = new Map<number, string>();
    for (const p of this.perfiles()) map.set(p.id, p.nombre);
    return map;
  });

  protected readonly recursosPorId = computed(() => {
    const map = new Map<number, string>();
    for (const r of this.recursos()) map.set(r.id, r.nombre);
    return map;
  });

  protected readonly accionPrimaria = computed<AccionPrimaria | null>(() => {
    const p = this.pedido();
    if (!p) return null;
    return ACCION_PRIMARIA[p.estado] ?? null;
  });

  protected readonly accionDestructiva = computed<AccionDestructiva | null>(
    () => {
      const p = this.pedido();
      if (!p) return null;
      return ACCIONES_DESTRUCTIVAS[p.estado] ?? null;
    },
  );

  protected readonly mensajeEspera = computed<string | null>(() => {
    const p = this.pedido();
    if (!p) return null;
    return MENSAJES_ESPERA[p.estado] ?? null;
  });

  protected readonly esConsumible = computed<boolean>(() => {
    const p = this.pedido();
    return p ? PEDIDOS_CONSUMIBLES.has(p.estado) : false;
  });

  protected readonly importeTotal = computed<number>(() => {
    const p = this.pedido();
    if (!p) return 0;
    return p.lineas.reduce((acc, l) => acc + l.horasOfertadas * l.precioHora, 0);
  });

  protected readonly horasOfertadas = computed<number>(() => {
    const p = this.pedido();
    if (!p) return 0;
    return p.lineas.reduce((acc, l) => acc + l.horasOfertadas, 0);
  });

  protected readonly horasConsumidasPorLinea = computed(() => {
    const map = new Map<number, number>();
    for (const c of this.consumos()) {
      map.set(
        c.lineaPedidoId,
        (map.get(c.lineaPedidoId) ?? 0) + c.horasConsumidas,
      );
    }
    return map;
  });

  protected readonly horasConsumidas = computed<number>(() => {
    let total = 0;
    for (const horas of this.horasConsumidasPorLinea().values()) {
      total += horas;
    }
    return total;
  });

  protected readonly porcentajeCompletado = computed<number>(() => {
    const ofertadas = this.horasOfertadas();
    if (ofertadas <= 0) return 0;
    return Math.min(100, Math.round((this.horasConsumidas() / ofertadas) * 100));
  });

  protected readonly tituloPagina = computed<string>(() => {
    const p = this.pedido();
    if (!p) return 'Pedido';
    const proy = this.proyecto()?.nombre ?? `Proyecto #${p.proyectoId}`;
    return `Pedido #${p.id} · ${proy}`;
  });

  /**
   * Última transición a estado terminal (Rechazado/Cancelado) registrada en el
   * historial. Si el pedido es terminal pero no hay entrada (pedido pre-#16
   * sin auditoría), cae a `updatedAt` como aproximación.
   */
  private readonly entradaTerminal = computed<HistorialPedido | null>(() => {
    const p = this.pedido();
    if (!p || !ESTADOS_TERMINALES.has(p.estado)) return null;
    for (let i = p.historial.length - 1; i >= 0; i--) {
      const h = p.historial[i];
      if (h.estadoNuevo === p.estado) return h;
    }
    return null;
  });

  protected readonly fechaTerminacion = computed<string | null>(() => {
    const p = this.pedido();
    if (!p || !ESTADOS_TERMINALES.has(p.estado)) return null;
    return this.entradaTerminal()?.fecha ?? p.updatedAt;
  });

  protected readonly estadoPrevioTerminal = computed<EstadoPedido | null>(
    () => this.entradaTerminal()?.estadoAnterior ?? null,
  );

  protected readonly historialFilas = computed<HistorialFila[]>(() => {
    const p = this.pedido();
    if (!p) return [];
    return p.historial.map((h) => ({
      id: h.id,
      fecha: h.fecha,
      fechaCorta: formatearFechaCorta(h.fecha),
      estadoAnterior: etiquetaEstadoPedido(h.estadoAnterior),
      estadoNuevo: etiquetaEstadoPedido(h.estadoNuevo),
      accionLabel: ACCIONES_HISTORIAL_LABEL[h.accion],
    }));
  });

  constructor() {
    this.cargar();
  }

  protected reintentar(): void {
    this.cargar();
  }

  protected etiqueta(estado: EstadoPedido): string {
    return etiquetaEstadoPedido(estado);
  }

  protected formatoFechaCorta(iso: string | null | undefined): string | null {
    return formatearFechaCorta(iso ?? null);
  }

  protected nombrePerfil(id: number): string {
    return this.perfilesPorId().get(id) ?? `#${id}`;
  }

  protected nombreRecurso(id: number): string {
    return this.recursosPorId().get(id) ?? `#${id}`;
  }

  protected horasConsumidasDeLinea(lineaId: number): number {
    return this.horasConsumidasPorLinea().get(lineaId) ?? 0;
  }

  protected porcentajeLinea(linea: LineaPedido): number {
    if (linea.horasOfertadas <= 0) return 0;
    const consumidas = this.horasConsumidasDeLinea(linea.id);
    return Math.min(100, Math.round((consumidas / linea.horasOfertadas) * 100));
  }

  protected async ejecutarPrimaria(): Promise<void> {
    const accion = this.accionPrimaria();
    const p = this.pedido();
    if (!accion || !p) return;
    const ok = await this.confirm.normal({
      titulo: `${accion.label} pedido`,
      mensaje: `¿${accion.label} el pedido #${p.id}?`,
      accionLabel: `${accion.label} pedido`,
    });
    if (!ok) return;
    this.invocarTransicion(p, accion.accion, accion.label);
  }

  protected async ejecutarDestructiva(): Promise<void> {
    const accion = this.accionDestructiva();
    const p = this.pedido();
    if (!accion || !p) return;
    const ok = await this.confirm.destructivo({
      titulo: `${accion.label} pedido`,
      mensaje: `¿${accion.label} el pedido #${p.id}? Esta acción es irreversible.`,
      accionLabel: `${accion.label} pedido`,
    });
    if (!ok) return;
    this.invocarTransicion(p, accion.accion, accion.label);
  }

  private invocarTransicion(
    p: Pedido,
    accion: AccionPedido,
    label: string,
  ): void {
    this.api.transitar(p.id, accion).subscribe({
      next: (actualizado) => {
        this.pedido.set(actualizado);
        this.toast.add({
          severity: 'success',
          summary: `Pedido ${label.toLowerCase()}`,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo cambiar el estado',
          detail: this.extraerCopyError(err),
        });
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
      detail: `${consumo.horasConsumidas} h en ${consumo.mes}/${consumo.anio}.`,
    });
    this.refrescarPedido();
  }

  protected pedidosParaDrawer = computed<Pedido[]>(() => {
    const p = this.pedido();
    return p ? [p] : [];
  });

  private refrescarPedido(): void {
    const id = this.idPedido();
    if (id === null) return;
    this.api.get(id).subscribe({
      next: (p) => this.pedido.set(p),
      error: () => {
        // Silencioso: el consumo ya está en la lista local.
      },
    });
  }

  private cargar(): void {
    const id = this.idPedido();
    if (id === null) {
      this.noEncontrado.set(true);
      return;
    }
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.noEncontrado.set(false);

    this.api.get(id).subscribe({
      next: (pedido) => {
        this.pedido.set(pedido);
        this.cargarDatosRelacionados(pedido);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        if (err.status === 404) {
          this.noEncontrado.set(true);
          return;
        }
        this.errorCarga.set(this.extraerCopyError(err));
      },
    });
  }

  private cargarDatosRelacionados(pedido: Pedido): void {
    forkJoin({
      proyecto: this.proyectosApi.get(pedido.proyectoId),
      proveedores: this.proveedoresApi.list(),
      perfiles: this.perfilesApi.list(),
      recursos: this.recursosApi.list(),
      consumos: this.consumosApi.list({ pedidoId: pedido.id }),
    }).subscribe({
      next: ({ proyecto, proveedores, perfiles, recursos, consumos }) => {
        this.proyecto.set(proyecto);
        this.proveedor.set(
          proveedores.find((p) => p.id === pedido.proveedorId) ?? null,
        );
        this.perfiles.set(perfiles);
        this.recursos.set(recursos);
        this.consumos.set(consumos);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorCarga.set(this.extraerCopyError(err));
      },
    });
  }

  protected volverALista(): void {
    void this.router.navigate(['/pedidos']);
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
    if (Array.isArray(body?.message)) {
      return body.message.join(', ');
    }
    if (typeof body?.message === 'string') {
      return body.message;
    }
    return err.message;
  }
}
