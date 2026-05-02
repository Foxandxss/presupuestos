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
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { forkJoin } from 'rxjs';

import { Rol } from '@operaciones/dominio';
import { ModalComponent, PreConfirm } from '@operaciones/ui/dialogos';
import { mapearErrorACopy } from '@operaciones/ui/errores';
import {
  etiquetaEstadoPedido,
  formatearFechaCorta,
  StatusBadgeComponent,
} from '@operaciones/ui/estados-pedido';
import { ErrorStateComponent, LoadingStateComponent } from '@operaciones/ui/listado';

import { PreIfRolDirective } from '../auth/pre-if-rol.directive';
import { PerfilesTecnicosApi } from '../catalogo/catalogo.api';
import type { PerfilTecnico } from '../catalogo/catalogo.types';
import { PedidosApi } from '../pedidos/pedidos.api';
import type { Pedido } from '../pedidos/pedidos.types';

import { ProyectosApi } from './proyectos.api';
import type {
  EstimacionPerfilConDerivados,
  Proyecto,
} from './proyectos.types';

interface FilaEditableEstimacion {
  filaId: string;
  estimacionId: number | null;
  perfilTecnicoId: number | null;
  horasEstimadas: number | null;
  horasOfertadas: number;
  horasConsumidas: number;
}

@Component({
  selector: 'app-proyecto-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    DatePickerModule,
    SelectModule,
    ToastModule,
    ModalComponent,
    StatusBadgeComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PreIfRolDirective,
  ],
  templateUrl: './proyecto-detail.page.html',
  styleUrl: './proyecto-detail.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProyectoDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ProyectosApi);
  private readonly perfilesApi = inject(PerfilesTecnicosApi);
  private readonly pedidosApi = inject(PedidosApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(PreConfirm);

  protected readonly Rol = Rol;

  protected readonly proyecto = signal<Proyecto | null>(null);
  protected readonly estimaciones = signal<EstimacionPerfilConDerivados[]>([]);
  protected readonly perfiles = signal<PerfilTecnico[]>([]);
  protected readonly pedidos = signal<Pedido[]>([]);

  protected readonly cargando = signal(false);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly noEncontrado = signal(false);
  protected readonly dialogVisible = signal(false);

  // Estimación inline edit: fila siendo editada (filaId del array local)
  protected readonly filaEditandoId = signal<string | null>(null);
  protected readonly filasEstimaciones = signal<FilaEditableEstimacion[]>([]);
  // Para "Añadir perfil": una fila nueva en blanco
  private filaNuevaContador = 0;

  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  protected readonly idProyecto = computed<number | null>(() => {
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

  protected readonly perfilesUsadosIds = computed<Set<number>>(() => {
    const ids = new Set<number>();
    for (const f of this.filasEstimaciones()) {
      if (f.perfilTecnicoId !== null && f.estimacionId !== null) {
        ids.add(f.perfilTecnicoId);
      }
    }
    return ids;
  });

  protected readonly perfilesDisponiblesParaNueva = computed(() => {
    const usados = this.perfilesUsadosIds();
    return this.perfiles().filter((p) => !usados.has(p.id));
  });

  // KPIs
  protected readonly horasEstimadas = computed<number>(() => {
    return this.estimaciones().reduce((acc, e) => acc + e.horasEstimadas, 0);
  });

  protected readonly horasOfertadas = computed<number>(() => {
    return this.estimaciones().reduce((acc, e) => acc + e.horasOfertadas, 0);
  });

  protected readonly horasConsumidas = computed<number>(() => {
    return this.estimaciones().reduce((acc, e) => acc + e.horasConsumidas, 0);
  });

  protected readonly horasPendientes = computed<number>(() => {
    return Math.max(0, this.horasOfertadas() - this.horasConsumidas());
  });

  protected readonly porcentajeOfertadasSobreEstimadas = computed<number | null>(
    () => {
      const est = this.horasEstimadas();
      if (est <= 0) return null;
      return Math.round((this.horasOfertadas() / est) * 100);
    },
  );

  protected readonly porcentajeConsumidasSobreOfertadas = computed<
    number | null
  >(() => {
    const ofe = this.horasOfertadas();
    if (ofe <= 0) return null;
    return Math.round((this.horasConsumidas() / ofe) * 100);
  });

  protected readonly porcentajePendientesSobreOfertadas = computed<
    number | null
  >(() => {
    const ofe = this.horasOfertadas();
    if (ofe <= 0) return null;
    return Math.round((this.horasPendientes() / ofe) * 100);
  });

  protected readonly estadoCalculado = computed<'activo' | 'cerrado'>(() => {
    const p = this.proyecto();
    if (!p) return 'activo';
    if (!p.fechaFin) return 'activo';
    const hoy = new Date().toISOString().slice(0, 10);
    return p.fechaFin > hoy ? 'activo' : 'cerrado';
  });

  protected readonly subtituloProyecto = computed<string>(() => {
    const p = this.proyecto();
    if (!p) return '';
    const estado = this.estadoCalculado() === 'activo' ? 'Activo' : 'Cerrado';
    const inicio = formatearFechaCorta(p.fechaInicio) ?? p.fechaInicio;
    const fin = p.fechaFin ? formatearFechaCorta(p.fechaFin) ?? p.fechaFin : null;
    if (fin) return `${estado} · ${inicio} – ${fin}`;
    return `${estado} · desde ${inicio}`;
  });

  // Form para edición de cabecera
  protected readonly form: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    descripcion: [''],
    fechaInicio: [null as Date | null, [Validators.required]],
    fechaFin: [null as Date | null],
  });

  constructor() {
    this.cargar();
  }

  protected reintentar(): void {
    this.cargar();
  }

  protected etiqueta(estado: string): string {
    return etiquetaEstadoPedido(estado as never);
  }

  protected formatoFechaCorta(iso: string | null | undefined): string | null {
    return formatearFechaCorta(iso ?? null);
  }

  protected nombrePerfil(id: number | null): string {
    if (id === null) return '—';
    return this.perfilesPorId().get(id) ?? `#${id}`;
  }

  protected porcentajeBarra(consumidas: number, ofertadas: number): number {
    if (ofertadas <= 0) return 0;
    return Math.min(100, Math.round((consumidas / ofertadas) * 100));
  }

  protected volverALista(): void {
    void this.router.navigate(['/proyectos']);
  }

  protected onPedidoRowClick(p: Pedido): void {
    void this.router.navigate(['/pedidos', p.id]);
  }

  protected crearPedidoEnEsteProyecto(): void {
    void this.router.navigate(['/pedidos']);
  }

  // ───────── Editar cabecera ─────────

  protected abrirEditarCabecera(): void {
    const p = this.proyecto();
    if (!p) return;
    this.form.patchValue({
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      fechaInicio: parseISODate(p.fechaInicio),
      fechaFin: p.fechaFin ? parseISODate(p.fechaFin) : null,
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.dialogVisible.set(true);
  }

  protected cerrarDialog(): void {
    this.dialogVisible.set(false);
  }

  protected guardarCabecera(): void {
    const p = this.proyecto();
    if (!p || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const fechaInicio = formatISODate(this.form.value.fechaInicio as Date);
    const fechaFinValor = this.form.value.fechaFin as Date | null;
    const fechaFin = fechaFinValor ? formatISODate(fechaFinValor) : undefined;
    if (fechaFin && fechaFin <= fechaInicio) {
      this.toast.add({
        severity: 'error',
        summary: 'Fechas inválidas',
        detail: 'La fecha de fin debe ser posterior a la de inicio',
      });
      return;
    }
    const descripcion = (this.form.value.descripcion as string).trim();
    this.api
      .update(p.id, {
        nombre: this.form.value.nombre as string,
        descripcion: descripcion ? descripcion : undefined,
        fechaInicio,
        fechaFin,
      })
      .subscribe({
        next: (proy) => {
          this.proyecto.set(proy);
          this.dialogVisible.set(false);
          this.toast.add({
            severity: 'success',
            summary: 'Proyecto actualizado',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.toast.add({
            severity: 'error',
            summary: 'No se pudo guardar',
            detail: this.extraerCopyError(err),
          });
        },
      });
  }

  // ───────── Eliminar proyecto ─────────

  protected async eliminarProyecto(): Promise<void> {
    const p = this.proyecto();
    if (!p) return;
    const ok = await this.confirm.destructivo({
      titulo: 'Eliminar proyecto',
      mensaje: `¿Eliminar el proyecto "${p.nombre}"? Esta acción es irreversible.`,
      accionLabel: 'Eliminar proyecto',
    });
    if (!ok) return;
    this.api.delete(p.id).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: 'Proyecto eliminado',
        });
        void this.router.navigate(['/proyectos']);
      },
      error: (err: HttpErrorResponse) => {
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo eliminar',
          detail: this.extraerCopyError(err),
        });
      },
    });
  }

  // ───────── Estimaciones inline ─────────

  protected anadirFilaPerfil(): void {
    const filaId = `nueva-${++this.filaNuevaContador}`;
    this.filasEstimaciones.update((lista) => [
      ...lista,
      {
        filaId,
        estimacionId: null,
        perfilTecnicoId: null,
        horasEstimadas: null,
        horasOfertadas: 0,
        horasConsumidas: 0,
      },
    ]);
    this.filaEditandoId.set(filaId);
  }

  protected editarFila(filaId: string): void {
    this.filaEditandoId.set(filaId);
  }

  protected cancelarEdicion(filaId: string): void {
    const fila = this.filasEstimaciones().find((f) => f.filaId === filaId);
    if (fila && fila.estimacionId === null) {
      // Descartar fila nueva sin guardar
      this.filasEstimaciones.update((lista) =>
        lista.filter((f) => f.filaId !== filaId),
      );
    } else if (fila) {
      // Restaurar valores de las estimaciones cargadas
      const original = this.estimaciones().find(
        (e) => e.id === fila.estimacionId,
      );
      if (original) {
        this.filasEstimaciones.update((lista) =>
          lista.map((f) =>
            f.filaId === filaId
              ? {
                  ...f,
                  perfilTecnicoId: original.perfilTecnicoId,
                  horasEstimadas: original.horasEstimadas,
                }
              : f,
          ),
        );
      }
    }
    this.filaEditandoId.set(null);
  }

  protected guardarFila(filaId: string): void {
    const proyectoId = this.idProyecto();
    if (proyectoId === null) return;
    const fila = this.filasEstimaciones().find((f) => f.filaId === filaId);
    if (!fila) return;
    if (
      fila.perfilTecnicoId === null ||
      fila.horasEstimadas === null ||
      fila.horasEstimadas < 0
    ) {
      this.toast.add({
        severity: 'error',
        summary: 'Datos incompletos',
        detail: 'Selecciona un perfil y unas horas no negativas.',
      });
      return;
    }

    const dto = {
      perfilTecnicoId: fila.perfilTecnicoId,
      horasEstimadas: fila.horasEstimadas,
    };

    if (fila.estimacionId === null) {
      this.api.addEstimacion(proyectoId, dto).subscribe({
        next: () => {
          this.filaEditandoId.set(null);
          this.recargarEstimaciones();
          this.toast.add({
            severity: 'success',
            summary: 'Estimación añadida',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.toast.add({
            severity: 'error',
            summary: 'No se pudo guardar',
            detail: this.extraerCopyError(err),
          });
        },
      });
    } else {
      this.api
        .updateEstimacion(proyectoId, fila.estimacionId, dto)
        .subscribe({
          next: () => {
            this.filaEditandoId.set(null);
            this.recargarEstimaciones();
            this.toast.add({
              severity: 'success',
              summary: 'Estimación actualizada',
            });
          },
          error: (err: HttpErrorResponse) => {
            this.toast.add({
              severity: 'error',
              summary: 'No se pudo guardar',
              detail: this.extraerCopyError(err),
            });
          },
        });
    }
  }

  protected async eliminarFila(filaId: string): Promise<void> {
    const proyectoId = this.idProyecto();
    if (proyectoId === null) return;
    const fila = this.filasEstimaciones().find((f) => f.filaId === filaId);
    if (!fila || fila.estimacionId === null) {
      this.cancelarEdicion(filaId);
      return;
    }
    const ok = await this.confirm.destructivo({
      titulo: 'Eliminar estimación',
      mensaje: `¿Eliminar la estimación de ${this.nombrePerfil(fila.perfilTecnicoId)}? Esta acción es irreversible.`,
      accionLabel: 'Eliminar estimación',
    });
    if (!ok) return;
    this.api
      .deleteEstimacion(proyectoId, fila.estimacionId)
      .subscribe({
        next: () => {
          this.recargarEstimaciones();
          this.toast.add({
            severity: 'success',
            summary: 'Estimación eliminada',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.toast.add({
            severity: 'error',
            summary: 'No se pudo eliminar',
            detail: this.extraerCopyError(err),
          });
        },
      });
  }

  protected onPerfilFilaChange(filaId: string, perfilId: number | null): void {
    this.filasEstimaciones.update((lista) =>
      lista.map((f) =>
        f.filaId === filaId ? { ...f, perfilTecnicoId: perfilId } : f,
      ),
    );
  }

  protected onHorasFilaChange(filaId: string, horas: number | null): void {
    this.filasEstimaciones.update((lista) =>
      lista.map((f) =>
        f.filaId === filaId ? { ...f, horasEstimadas: horas } : f,
      ),
    );
  }

  // ───────── Carga ─────────

  private cargar(): void {
    const id = this.idProyecto();
    if (id === null) {
      this.noEncontrado.set(true);
      return;
    }
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.noEncontrado.set(false);

    this.api.get(id).subscribe({
      next: (proyecto) => {
        this.proyecto.set(proyecto);
        this.cargarRelacionados(id);
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

  private cargarRelacionados(id: number): void {
    forkJoin({
      estimaciones: this.api.listEstimaciones(id),
      perfiles: this.perfilesApi.list(),
      pedidos: this.pedidosApi.list(),
    }).subscribe({
      next: ({ estimaciones, perfiles, pedidos }) => {
        this.estimaciones.set(estimaciones);
        this.perfiles.set(perfiles);
        this.pedidos.set(pedidos.filter((p) => p.proyectoId === id));
        this.filasEstimaciones.set(this.filasDeEstimaciones(estimaciones));
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorCarga.set(this.extraerCopyError(err));
      },
    });
  }

  private recargarEstimaciones(): void {
    const id = this.idProyecto();
    if (id === null) return;
    this.api.listEstimaciones(id).subscribe({
      next: (estimaciones) => {
        this.estimaciones.set(estimaciones);
        this.filasEstimaciones.set(this.filasDeEstimaciones(estimaciones));
      },
    });
  }

  private filasDeEstimaciones(
    estimaciones: EstimacionPerfilConDerivados[],
  ): FilaEditableEstimacion[] {
    return estimaciones.map((e) => ({
      filaId: `existente-${e.id}`,
      estimacionId: e.id,
      perfilTecnicoId: e.perfilTecnicoId,
      horasEstimadas: e.horasEstimadas,
      horasOfertadas: e.horasOfertadas,
      horasConsumidas: e.horasConsumidas,
    }));
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
