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
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { forkJoin } from 'rxjs';

import { Rol } from '@operaciones/dominio';
import {
  etiquetaEstadoPedido,
  StatusBadgeComponent,
  StatusTimelineComponent,
} from '@operaciones/ui/estados-pedido';
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
  ServiciosApi,
} from '../catalogo/catalogo.api';
import type {
  PerfilTecnico,
  Proveedor,
  Servicio,
} from '../catalogo/catalogo.types';
import { ProyectosApi } from '../proyectos/proyectos.api';
import type { Proyecto } from '../proyectos/proyectos.types';
import { PedidosApi } from './pedidos.api';
import type {
  AccionPedido,
  CrearLineaPedido,
  CrearPedido,
  EstadoPedido,
  LineaPedido,
  Pedido,
} from './pedidos.types';

interface AccionDisponible {
  accion: AccionPedido;
  label: string;
  icon: string;
  severity: 'primary' | 'success' | 'danger' | 'warn' | 'secondary';
}

const ACCIONES_POR_ESTADO: Record<EstadoPedido, AccionDisponible[]> = {
  Borrador: [
    {
      accion: 'solicitar',
      label: 'Solicitar',
      icon: 'pi pi-send',
      severity: 'primary',
    },
  ],
  Solicitado: [
    {
      accion: 'aprobar',
      label: 'Aprobar',
      icon: 'pi pi-check',
      severity: 'success',
    },
    {
      accion: 'rechazar',
      label: 'Rechazar',
      icon: 'pi pi-times',
      severity: 'danger',
    },
  ],
  Aprobado: [
    {
      accion: 'cancelar',
      label: 'Cancelar',
      icon: 'pi pi-ban',
      severity: 'warn',
    },
  ],
  EnEjecucion: [
    {
      accion: 'cancelar',
      label: 'Cancelar',
      icon: 'pi pi-ban',
      severity: 'warn',
    },
  ],
  Consumido: [],
  Rechazado: [],
  Cancelado: [],
};

const ESTADOS_EDITABLES: ReadonlySet<EstadoPedido> = new Set([
  'Borrador',
  'Solicitado',
]);

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

const STORAGE_KEY_DENSIDAD = 'presupuestos.lista.densidad.pedidos';
const STORAGE_KEY_FILAS = 'presupuestos.lista.filas.pedidos';

function leerDensidadInicial(): DensidadLista {
  if (typeof localStorage === 'undefined') return 'estandar';
  const raw = localStorage.getItem(STORAGE_KEY_DENSIDAD);
  return raw === 'compacta' ? 'compacta' : 'estandar';
}

function leerFilasInicial(): number {
  if (typeof localStorage === 'undefined') return 10;
  const raw = Number(localStorage.getItem(STORAGE_KEY_FILAS));
  return [10, 25, 50].includes(raw) ? raw : 10;
}

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    DatePickerModule,
    SelectModule,
    MultiSelectModule,
    ToastModule,
    ConfirmDialogModule,
    StatusBadgeComponent,
    StatusTimelineComponent,
    ListPageComponent,
    ListToolbarComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    PreIfRolDirective,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './pedidos.page.html',
  styleUrl: './pedidos.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidosPage {
  private readonly api = inject(PedidosApi);
  private readonly proyectosApi = inject(ProyectosApi);
  private readonly proveedoresApi = inject(ProveedoresApi);
  private readonly perfilesApi = inject(PerfilesTecnicosApi);
  private readonly serviciosApi = inject(ServiciosApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly Rol = Rol;
  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly proyectos = signal<Proyecto[]>([]);
  protected readonly proveedores = signal<Proveedor[]>([]);
  protected readonly perfiles = signal<PerfilTecnico[]>([]);
  protected readonly servicios = signal<Servicio[]>([]);
  protected readonly cargando = signal(false);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly dialogVisible = signal(false);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly estadoActual = signal<EstadoPedido>('Borrador');
  protected readonly pedidoActual = signal<Pedido | null>(null);

  protected readonly estadosOpciones = ESTADOS_OPCIONES;

  protected readonly densidad = signal<DensidadLista>(leerDensidadInicial());
  protected readonly filasPorPagina = signal<number>(leerFilasInicial());

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly q = computed(() => this.queryParams().get('q') ?? '');
  protected readonly estadosFiltro = computed<EstadoPedido[]>(() => {
    const raw = this.queryParams().get('estado');
    if (!raw) return [];
    const todos = new Set<EstadoPedido>(
      ESTADOS_OPCIONES.map((o) => o.value),
    );
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is EstadoPedido => todos.has(s as EstadoPedido));
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
      this.q().length > 0 ||
      this.estadosFiltro().length > 0 ||
      this.proveedorFiltro() !== null ||
      this.proyectoFiltro() !== null,
  );

  protected readonly proyectosPorId = computed(() => {
    const map = new Map<number, string>();
    for (const p of this.proyectos()) map.set(p.id, p.nombre);
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

  protected readonly pedidosFiltrados = computed(() => {
    const lista = this.pedidos();
    const query = this.q().trim().toLowerCase();
    const estados = this.estadosFiltro();
    const proveedorId = this.proveedorFiltro();
    const proyectoId = this.proyectoFiltro();
    const proyMap = this.proyectosPorId();
    const provMap = this.proveedoresPorId();

    return lista.filter((p) => {
      if (estados.length > 0 && !estados.includes(p.estado)) return false;
      if (proveedorId !== null && p.proveedorId !== proveedorId) return false;
      if (proyectoId !== null && p.proyectoId !== proyectoId) return false;
      if (query.length > 0) {
        const idMatch = String(p.id).includes(query.replace(/^#/, ''));
        const proyMatch = (proyMap.get(p.proyectoId) ?? '')
          .toLowerCase()
          .includes(query);
        const provMatch = (provMap.get(p.proveedorId) ?? '')
          .toLowerCase()
          .includes(query);
        if (!idMatch && !proyMatch && !provMatch) return false;
      }
      return true;
    });
  });

  protected readonly resumen = computed(() => {
    const total = this.pedidos().length;
    const visibles = this.pedidosFiltrados().length;
    if (total === 0) return null;
    if (!this.hayFiltrosActivos()) return null;
    return `Mostrando ${visibles} de ${total}`;
  });

  protected readonly form: FormGroup = this.fb.group({
    proyectoId: [null as number | null, [Validators.required]],
    proveedorId: [null as number | null, [Validators.required]],
    lineas: this.fb.array([]),
  });

  constructor() {
    this.cargar();
    this.form.get('proveedorId')?.valueChanges.subscribe(() => {
      this.reaplicarTarifas();
    });
    effect(() => {
      const d = this.densidad();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_DENSIDAD, d);
      }
    });
    effect(() => {
      const f = this.filasPorPagina();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_FILAS, String(f));
      }
    });
  }

  get lineasArray(): FormArray {
    return this.form.get('lineas') as FormArray;
  }

  nombreProyecto(id: number): string {
    return this.proyectosPorId().get(id) ?? `#${id}`;
  }

  nombreProveedor(id: number): string {
    return this.proveedoresPorId().get(id) ?? `#${id}`;
  }

  nombrePerfil(id: number): string {
    return this.perfilesPorId().get(id) ?? `#${id}`;
  }

  accionesDisponibles(estado: EstadoPedido): AccionDisponible[] {
    return ACCIONES_POR_ESTADO[estado];
  }

  etiquetaEstado(estado: EstadoPedido): string {
    return etiquetaEstadoPedido(estado);
  }

  esEditable(estado: EstadoPedido): boolean {
    return ESTADOS_EDITABLES.has(estado);
  }

  totalPresupuesto(p: Pedido): number {
    return p.lineas.reduce(
      (acc, l) => acc + l.horasOfertadas * l.precioHora,
      0,
    );
  }

  protected onQueryChange(valor: string): void {
    this.actualizarParam('q', valor.trim() || null);
  }

  protected onEstadosChange(valores: EstadoPedido[] | null): void {
    const v = valores ?? [];
    this.actualizarParam('estado', v.length > 0 ? v.join(',') : null);
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

  protected reintentarCarga(): void {
    this.cargar();
  }

  protected onRowClick(row: Pedido): void {
    void this.router.navigate(['/pedidos', row.id]);
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
      pedidos: this.api.list(),
      proyectos: this.proyectosApi.list(),
      proveedores: this.proveedoresApi.list(),
      perfiles: this.perfilesApi.list(),
      servicios: this.serviciosApi.list(),
    }).subscribe({
      next: ({ pedidos, proyectos, proveedores, perfiles, servicios }) => {
        this.pedidos.set(pedidos);
        this.proyectos.set(proyectos);
        this.proveedores.set(proveedores);
        this.perfiles.set(perfiles);
        this.servicios.set(servicios);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorCarga.set(extraerMensaje(err));
      },
    });
  }

  abrirCrear(): void {
    this.editandoId.set(null);
    this.estadoActual.set('Borrador');
    this.pedidoActual.set(null);
    this.lineasArray.clear();
    this.form.reset({
      proyectoId: null,
      proveedorId: null,
    });
    this.form.enable();
    this.dialogVisible.set(true);
  }

  abrirEditar(row: Pedido): void {
    this.editandoId.set(row.id);
    this.estadoActual.set(row.estado);
    this.pedidoActual.set(row);
    this.lineasArray.clear();
    this.form.patchValue({
      proyectoId: row.proyectoId,
      proveedorId: row.proveedorId,
    });
    for (const linea of row.lineas) {
      this.lineasArray.push(this.crearFilaLinea(linea));
    }
    if (!this.esEditable(row.estado)) {
      this.form.disable();
    } else {
      this.form.enable();
    }
    this.dialogVisible.set(true);
  }

  cerrarDialog(): void {
    this.dialogVisible.set(false);
  }

  agregarLinea(): void {
    this.lineasArray.push(this.crearFilaLinea());
  }

  quitarLinea(index: number): void {
    this.lineasArray.removeAt(index);
  }

  onPerfilChange(index: number): void {
    this.aplicarTarifaPrerrelleno(index);
  }

  private reaplicarTarifas(): void {
    for (let i = 0; i < this.lineasArray.length; i++) {
      this.aplicarTarifaPrerrelleno(i, true);
    }
  }

  private aplicarTarifaPrerrelleno(
    index: number,
    soloSiVacio = false,
  ): void {
    const fila = this.lineasArray.at(index) as FormGroup;
    const proveedorId = this.form.value.proveedorId as number | null;
    const perfilId = fila.value.perfilTecnicoId as number | null;
    if (!proveedorId || !perfilId) {
      return;
    }
    const tarifa = this.servicios().find(
      (s) => s.proveedorId === proveedorId && s.perfilTecnicoId === perfilId,
    )?.tarifaPorHora;
    if (tarifa === undefined) {
      return;
    }
    const actual = fila.value.precioHora as number | null;
    if (soloSiVacio && actual !== null && actual !== undefined) {
      return;
    }
    fila.patchValue({ precioHora: tarifa });
  }

  private crearFilaLinea(linea?: LineaPedido): FormGroup {
    return this.fb.group({
      id: [linea?.id ?? null],
      perfilTecnicoId: [
        linea?.perfilTecnicoId ?? null,
        [Validators.required],
      ],
      fechaInicio: [
        linea?.fechaInicio ? parseISODate(linea.fechaInicio) : null,
        [Validators.required],
      ],
      fechaFin: [
        linea?.fechaFin ? parseISODate(linea.fechaFin) : null,
        [Validators.required],
      ],
      horasOfertadas: [
        linea?.horasOfertadas ?? null,
        [Validators.required, Validators.min(0)],
      ],
      precioHora: [
        linea?.precioHora ?? null,
        [Validators.required, Validators.min(0)],
      ],
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const lineas: CrearLineaPedido[] = [];
    for (let i = 0; i < this.lineasArray.length; i++) {
      const fila = this.lineasArray.at(i) as FormGroup;
      const fechaInicio = fila.value.fechaInicio as Date;
      const fechaFin = fila.value.fechaFin as Date;
      if (!fechaInicio || !fechaFin) {
        continue;
      }
      const inicioStr = formatISODate(fechaInicio);
      const finStr = formatISODate(fechaFin);
      if (finStr <= inicioStr) {
        this.toast.add({
          severity: 'error',
          summary: 'Fechas inválidas en una línea',
          detail: 'La fecha de fin debe ser posterior a la de inicio',
        });
        return;
      }
      lineas.push({
        perfilTecnicoId: fila.value.perfilTecnicoId as number,
        fechaInicio: inicioStr,
        fechaFin: finStr,
        horasOfertadas: fila.value.horasOfertadas as number,
        precioHora: fila.value.precioHora as number,
      });
    }
    const dto: CrearPedido = {
      proyectoId: this.form.value.proyectoId as number,
      proveedorId: this.form.value.proveedorId as number,
      lineas,
    };
    const id = this.editandoId();
    const op = id === null ? this.api.create(dto) : this.api.update(id, dto);
    op.subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: id === null ? 'Pedido creado' : 'Pedido actualizado',
        });
        this.dialogVisible.set(false);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo guardar',
          detail: extraerMensaje(err),
        });
      },
    });
  }

  ejecutarAccion(row: Pedido, accion: AccionDisponible): void {
    this.confirm.confirm({
      message: `¿${accion.label.toLowerCase()} el pedido #${row.id}?`,
      header: `Confirmar: ${accion.label}`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: accion.label,
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: accion.severity },
      accept: () => {
        this.api.transitar(row.id, accion.accion).subscribe({
          next: () => {
            this.toast.add({
              severity: 'success',
              summary: `Pedido ${accion.label.toLowerCase()}`,
            });
            this.cargar();
          },
          error: (err: HttpErrorResponse) => {
            this.toast.add({
              severity: 'error',
              summary: 'No se pudo cambiar el estado',
              detail: extraerMensaje(err),
            });
          },
        });
      },
    });
  }

  eliminar(row: Pedido): void {
    this.confirm.confirm({
      message: `¿Eliminar el pedido #${row.id}?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'danger' },
      accept: () => {
        this.api.delete(row.id).subscribe({
          next: () => {
            this.toast.add({
              severity: 'success',
              summary: 'Pedido eliminado',
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
      },
    });
  }
}

function parseISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function extraerMensaje(err: HttpErrorResponse): string {
  const body = err.error as { message?: string | string[] } | undefined;
  if (Array.isArray(body?.message)) {
    return body.message.join(', ');
  }
  if (typeof body?.message === 'string') {
    return body.message;
  }
  return err.message;
}
