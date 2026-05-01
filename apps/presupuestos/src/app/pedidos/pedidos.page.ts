import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { forkJoin } from 'rxjs';

import {
  etiquetaEstadoPedido,
  StatusBadgeComponent,
  StatusTimelineComponent,
} from '@operaciones/ui/estados-pedido';

import { AuthService } from '../auth/auth.service';
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

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    DatePickerModule,
    SelectModule,
    ToastModule,
    ConfirmDialogModule,
    StatusBadgeComponent,
    StatusTimelineComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './pedidos.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidosPage {
  private readonly api = inject(PedidosApi);
  private readonly proyectosApi = inject(ProyectosApi);
  private readonly proveedoresApi = inject(ProveedoresApi);
  private readonly perfilesApi = inject(PerfilesTecnicosApi);
  private readonly serviciosApi = inject(ServiciosApi);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly esAdmin = computed(() => this.auth.rol() === 'admin');
  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly proyectos = signal<Proyecto[]>([]);
  protected readonly proveedores = signal<Proveedor[]>([]);
  protected readonly perfiles = signal<PerfilTecnico[]>([]);
  protected readonly servicios = signal<Servicio[]>([]);
  protected readonly cargando = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly estadoActual = signal<EstadoPedido>('Borrador');
  protected readonly pedidoActual = signal<Pedido | null>(null);

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

  protected readonly form: FormGroup = this.fb.group({
    proyectoId: [null as number | null, [Validators.required]],
    proveedorId: [null as number | null, [Validators.required]],
    lineas: this.fb.array([]),
  });

  constructor() {
    this.cargar();
    this.form.get('proveedorId')?.valueChanges.subscribe(() => {
      // Al cambiar de proveedor, las tarifas prerellenadas pueden ser otras.
      this.reaplicarTarifas();
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

  private cargar(): void {
    this.cargando.set(true);
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
        this.toast.add({
          severity: 'error',
          summary: 'Error al cargar',
          detail: err.message,
        });
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
