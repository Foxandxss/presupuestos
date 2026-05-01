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
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { forkJoin } from 'rxjs';

import { AuthService } from '../auth/auth.service';
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
import { PedidosApi } from '../pedidos/pedidos.api';
import type { LineaPedido, Pedido } from '../pedidos/pedidos.types';
import { mapearErrorACopy } from '@operaciones/ui/errores';
import { ConsumosApi } from './consumos.api';
import type { Consumo, CrearConsumo } from './consumos.types';

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

interface OpcionLinea {
  id: number;
  pedidoId: number;
  perfilTecnicoId: number;
  fechaInicio: string;
  fechaFin: string;
  label: string;
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
    ReactiveFormsModule,
    TableModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    SelectModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './consumos.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsumosPage {
  private readonly api = inject(ConsumosApi);
  private readonly pedidosApi = inject(PedidosApi);
  private readonly recursosApi = inject(RecursosApi);
  private readonly proveedoresApi = inject(ProveedoresApi);
  private readonly perfilesApi = inject(PerfilesTecnicosApi);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly meses = MESES;
  protected readonly esAdmin = computed(() => this.auth.rol() === 'admin');
  protected readonly consumos = signal<Consumo[]>([]);
  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly recursos = signal<Recurso[]>([]);
  protected readonly proveedores = signal<Proveedor[]>([]);
  protected readonly perfiles = signal<PerfilTecnico[]>([]);
  protected readonly cargando = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly pedidoIdSeleccionado = signal<number | null>(null);

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

  protected readonly opcionesLinea = computed<OpcionLinea[]>(() => {
    const id = this.pedidoIdSeleccionado();
    if (id === null) return [];
    const pedido = this.pedidosPorId().get(id);
    if (!pedido) return [];
    const perfiles = this.perfilesPorId();
    return pedido.lineas.map((l) => ({
      id: l.id,
      pedidoId: pedido.id,
      perfilTecnicoId: l.perfilTecnicoId,
      fechaInicio: l.fechaInicio,
      fechaFin: l.fechaFin,
      label: `Línea #${l.id} · ${perfiles.get(l.perfilTecnicoId) ?? '?'} · ${l.fechaInicio} → ${l.fechaFin} · ${l.horasOfertadas}h ofertadas`,
    }));
  });

  protected readonly recursosDisponibles = computed<Recurso[]>(() => {
    const id = this.pedidoIdSeleccionado();
    if (id === null) return [];
    const pedido = this.pedidosPorId().get(id);
    if (!pedido) return [];
    return this.recursos().filter((r) => r.proveedorId === pedido.proveedorId);
  });

  protected readonly form: FormGroup = this.fb.group({
    pedidoId: [null as number | null, [Validators.required]],
    lineaPedidoId: [null as number | null, [Validators.required]],
    recursoId: [null as number | null, [Validators.required]],
    mes: [null as number | null, [Validators.required]],
    anio: [
      new Date().getFullYear(),
      [Validators.required, Validators.min(2000), Validators.max(2100)],
    ],
    horasConsumidas: [
      null as number | null,
      [Validators.required, Validators.min(0)],
    ],
  });

  constructor() {
    this.cargar();
    this.form.get('pedidoId')?.valueChanges.subscribe((id: number | null) => {
      this.pedidoIdSeleccionado.set(id);
      this.form.patchValue({ lineaPedidoId: null, recursoId: null });
    });
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

  private cargar(): void {
    this.cargando.set(true);
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
        this.toast.add({
          severity: 'error',
          summary: 'Error al cargar',
          detail: err.message,
        });
      },
    });
  }

  abrirCrear(): void {
    this.pedidoIdSeleccionado.set(null);
    this.form.reset({
      pedidoId: null,
      lineaPedidoId: null,
      recursoId: null,
      mes: null,
      anio: new Date().getFullYear(),
      horasConsumidas: null,
    });
    this.dialogVisible.set(true);
  }

  cerrarDialog(): void {
    this.dialogVisible.set(false);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const dto: CrearConsumo = {
      lineaPedidoId: this.form.value.lineaPedidoId as number,
      recursoId: this.form.value.recursoId as number,
      mes: this.form.value.mes as number,
      anio: this.form.value.anio as number,
      horasConsumidas: this.form.value.horasConsumidas as number,
    };
    this.api.create(dto).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: 'Consumo registrado',
        });
        this.dialogVisible.set(false);
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo registrar el consumo',
          detail: extraerMensaje(err),
        });
      },
    });
  }

  eliminar(row: Consumo): void {
    this.confirm.confirm({
      message: `¿Eliminar el consumo del ${row.mes}/${row.anio} de la línea #${row.lineaPedidoId}?`,
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
