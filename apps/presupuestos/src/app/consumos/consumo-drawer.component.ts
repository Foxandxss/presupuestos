import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';

import { mapearErrorACopy } from '@operaciones/ui/errores';

import type { PerfilTecnico, Recurso } from '../catalogo/catalogo.types';
import type { Pedido } from '../pedidos/pedidos.types';

import { ConsumosApi } from './consumos.api';
import type { Consumo, CrearConsumo } from './consumos.types';

interface OpcionPedido {
  id: number;
  label: string;
  proveedorId: number;
}

interface OpcionLinea {
  id: number;
  pedidoId: number;
  perfilNombre: string;
  fechaInicio: string;
  fechaFin: string;
  horasOfertadas: number;
  label: string;
}

interface OpcionMes {
  value: number;
  label: string;
}

const MESES: OpcionMes[] = [
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

const ESTADOS_PEDIDO_CONSUMIBLES = new Set<Pedido['estado']>([
  'Aprobado',
  'EnEjecucion',
]);

@Component({
  selector: 'pre-consumo-drawer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    SelectModule,
  ],
  templateUrl: './consumo-drawer.component.html',
  styleUrl: './consumo-drawer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsumoDrawerComponent {
  readonly abierto = input.required<boolean>();
  readonly pedidos = input.required<readonly Pedido[]>();
  readonly recursos = input.required<readonly Recurso[]>();
  readonly perfiles = input.required<readonly PerfilTecnico[]>();
  readonly consumosExistentes = input.required<readonly Consumo[]>();
  /** Cuando se abre desde la detail de un pedido, fija ese pedido. */
  readonly pedidoIdInicial = input<number | null>(null);
  /** Permite ocultar el selector de pedido (cuando el contexto ya lo fija). */
  readonly bloquearPedido = input<boolean>(false);

  readonly cerrar = output<void>();
  readonly registrado = output<Consumo>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ConsumosApi);
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  protected readonly meses = MESES;
  protected readonly errorRegistro = signal<string | null>(null);
  protected readonly enviando = signal(false);

  @ViewChild('primerCampo') private primerCampo?: ElementRef<HTMLElement>;

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

  protected readonly pedidoIdSeleccionado = signal<number | null>(null);
  protected readonly lineaIdSeleccionada = signal<number | null>(null);
  protected readonly recursoIdSeleccionado = signal<number | null>(null);
  protected readonly horasIngresadas = signal<number | null>(null);

  protected readonly pedidosPorId = computed(() => {
    const map = new Map<number, Pedido>();
    for (const p of this.pedidos()) map.set(p.id, p);
    return map;
  });

  protected readonly perfilesPorId = computed(() => {
    const map = new Map<number, string>();
    for (const p of this.perfiles()) map.set(p.id, p.nombre);
    return map;
  });

  protected readonly opcionesPedido = computed<OpcionPedido[]>(() => {
    return this.pedidos()
      .filter((p) => ESTADOS_PEDIDO_CONSUMIBLES.has(p.estado))
      .map((p) => ({
        id: p.id,
        proveedorId: p.proveedorId,
        label: `#${p.id} · ${p.estado}`,
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
      perfilNombre: perfiles.get(l.perfilTecnicoId) ?? '?',
      fechaInicio: l.fechaInicio,
      fechaFin: l.fechaFin,
      horasOfertadas: l.horasOfertadas,
      label: `Línea #${l.id} · ${perfiles.get(l.perfilTecnicoId) ?? '?'} · ${l.fechaInicio} → ${l.fechaFin} · ${l.horasOfertadas} h`,
    }));
  });

  protected readonly recursosDisponibles = computed<Recurso[]>(() => {
    const id = this.pedidoIdSeleccionado();
    if (id === null) return [];
    const pedido = this.pedidosPorId().get(id);
    if (!pedido) return [];
    return this.recursos().filter((r) => r.proveedorId === pedido.proveedorId);
  });

  protected readonly horasDisponibles = computed<number | null>(() => {
    const lineaId = this.lineaIdSeleccionada();
    const recursoId = this.recursoIdSeleccionado();
    if (lineaId === null || recursoId === null) return null;
    const opciones = this.opcionesLinea();
    const linea = opciones.find((l) => l.id === lineaId);
    if (!linea) return null;
    const consumidas = this.consumosExistentes()
      .filter((c) => c.lineaPedidoId === lineaId && c.recursoId === recursoId)
      .reduce((acc, c) => acc + c.horasConsumidas, 0);
    return Math.max(0, linea.horasOfertadas - consumidas);
  });

  protected readonly excedeDisponibles = computed<boolean>(() => {
    const ingresadas = this.horasIngresadas();
    const disponibles = this.horasDisponibles();
    if (ingresadas === null || disponibles === null) return false;
    return ingresadas > disponibles;
  });

  constructor() {
    this.form.get('pedidoId')?.valueChanges.subscribe((id: number | null) => {
      this.pedidoIdSeleccionado.set(id);
      this.form.patchValue(
        { lineaPedidoId: null, recursoId: null },
        { emitEvent: false },
      );
      this.lineaIdSeleccionada.set(null);
      this.recursoIdSeleccionado.set(null);
    });
    this.form
      .get('lineaPedidoId')
      ?.valueChanges.subscribe((id: number | null) => {
        this.lineaIdSeleccionada.set(id);
      });
    this.form
      .get('recursoId')
      ?.valueChanges.subscribe((id: number | null) => {
        this.recursoIdSeleccionado.set(id);
      });
    this.form
      .get('horasConsumidas')
      ?.valueChanges.subscribe((h: number | null) => {
        this.horasIngresadas.set(h);
      });

    effect(() => {
      if (this.abierto()) {
        const inicial = this.pedidoIdInicial();
        this.resetCompleto(inicial);
        this.errorRegistro.set(null);
        queueMicrotask(() => {
          const el = this.primerCampo?.nativeElement?.querySelector('input');
          if (el instanceof HTMLElement) {
            el.focus();
          }
        });
      }
    });
  }

  protected onCerrar(): void {
    if (this.enviando()) return;
    this.cerrar.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onCerrar();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (!this.abierto()) return;
    this.onCerrar();
  }

  protected onSubmit(): void {
    if (this.enviando()) return;
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
    this.enviando.set(true);
    this.errorRegistro.set(null);
    this.api.create(dto).subscribe({
      next: (consumo) => {
        this.enviando.set(false);
        this.registrado.emit(consumo);
        this.resetTrasRegistroOk();
      },
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        this.errorRegistro.set(this.extraerCopyError(err));
      },
    });
  }

  private resetCompleto(pedidoIdInicial: number | null): void {
    this.form.reset(
      {
        pedidoId: pedidoIdInicial,
        lineaPedidoId: null,
        recursoId: null,
        mes: null,
        anio: new Date().getFullYear(),
        horasConsumidas: null,
      },
      { emitEvent: false },
    );
    this.pedidoIdSeleccionado.set(pedidoIdInicial);
    this.lineaIdSeleccionada.set(null);
    this.recursoIdSeleccionado.set(null);
    this.horasIngresadas.set(null);
    this.form.markAsUntouched();
    this.form.markAsPristine();
  }

  /**
   * Tras registro OK, mantiene Pedido/Línea/Recurso para batch entry y
   * limpia sólo mes/año/horas. AC del PRD #15: "Registrar y nuevo".
   */
  private resetTrasRegistroOk(): void {
    this.form.patchValue(
      {
        mes: null,
        anio: new Date().getFullYear(),
        horasConsumidas: null,
      },
      { emitEvent: true },
    );
    this.form.get('mes')?.markAsUntouched();
    this.form.get('horasConsumidas')?.markAsUntouched();
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

  protected get hostElement(): HTMLElement {
    return this.hostRef.nativeElement;
  }
}
