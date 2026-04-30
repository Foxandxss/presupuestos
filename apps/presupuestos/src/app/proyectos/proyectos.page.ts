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
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { forkJoin } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { PerfilesTecnicosApi } from '../catalogo/catalogo.api';
import type { PerfilTecnico } from '../catalogo/catalogo.types';
import { ProyectosApi } from './proyectos.api';
import type {
  CrearEstimacion,
  CrearProyecto,
  EstimacionPerfil,
  Proyecto,
} from './proyectos.types';

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    DatePickerModule,
    SelectModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './proyectos.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProyectosPage {
  private readonly api = inject(ProyectosApi);
  private readonly perfilesApi = inject(PerfilesTecnicosApi);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly esAdmin = computed(() => this.auth.rol() === 'admin');
  protected readonly proyectos = signal<Proyecto[]>([]);
  protected readonly perfiles = signal<PerfilTecnico[]>([]);
  protected readonly cargando = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly editandoId = signal<number | null>(null);

  protected readonly perfilesPorId = computed(() => {
    const map = new Map<number, string>();
    for (const p of this.perfiles()) {
      map.set(p.id, p.nombre);
    }
    return map;
  });

  protected readonly form: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    descripcion: [''],
    fechaInicio: [null as Date | null, [Validators.required]],
    fechaFin: [null as Date | null],
    estimaciones: this.fb.array([]),
  });

  constructor() {
    this.cargar();
  }

  get estimacionesArray(): FormArray {
    return this.form.get('estimaciones') as FormArray;
  }

  nombrePerfil(id: number): string {
    return this.perfilesPorId().get(id) ?? `#${id}`;
  }

  totalHorasEstimadas(p: Proyecto): number {
    return p.estimaciones.reduce((acc, e) => acc + e.horasEstimadas, 0);
  }

  private cargar(): void {
    this.cargando.set(true);
    forkJoin({
      proyectos: this.api.list(),
      perfiles: this.perfilesApi.list(),
    }).subscribe({
      next: ({ proyectos, perfiles }) => {
        this.proyectos.set(proyectos);
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
    this.editandoId.set(null);
    this.estimacionesArray.clear();
    this.form.reset({
      nombre: '',
      descripcion: '',
      fechaInicio: null,
      fechaFin: null,
    });
    this.dialogVisible.set(true);
  }

  abrirEditar(row: Proyecto): void {
    this.editandoId.set(row.id);
    this.estimacionesArray.clear();
    this.form.patchValue({
      nombre: row.nombre,
      descripcion: row.descripcion ?? '',
      fechaInicio: parseISODate(row.fechaInicio),
      fechaFin: row.fechaFin ? parseISODate(row.fechaFin) : null,
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    for (const est of row.estimaciones) {
      this.estimacionesArray.push(this.crearFilaEstimacion(est));
    }
    this.dialogVisible.set(true);
  }

  cerrarDialog(): void {
    this.dialogVisible.set(false);
  }

  agregarEstimacion(): void {
    this.estimacionesArray.push(this.crearFilaEstimacion());
  }

  quitarEstimacion(index: number): void {
    this.estimacionesArray.removeAt(index);
  }

  private crearFilaEstimacion(est?: EstimacionPerfil): FormGroup {
    return this.fb.group({
      perfilTecnicoId: [
        est?.perfilTecnicoId ?? null,
        [Validators.required],
      ],
      horasEstimadas: [
        est?.horasEstimadas ?? null,
        [Validators.required, Validators.min(0)],
      ],
    });
  }

  guardar(): void {
    if (this.form.invalid) {
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
    const estimaciones: CrearEstimacion[] = this.estimacionesArray.controls.map(
      (g) => ({
        perfilTecnicoId: g.value.perfilTecnicoId as number,
        horasEstimadas: g.value.horasEstimadas as number,
      }),
    );
    const perfilesUsados = new Set<number>();
    for (const e of estimaciones) {
      if (perfilesUsados.has(e.perfilTecnicoId)) {
        this.toast.add({
          severity: 'error',
          summary: 'Estimaciones duplicadas',
          detail: 'No puedes repetir el mismo perfil técnico',
        });
        return;
      }
      perfilesUsados.add(e.perfilTecnicoId);
    }
    const descripcionTrim = (this.form.value.descripcion as string).trim();
    const dto: CrearProyecto = {
      nombre: this.form.value.nombre as string,
      descripcion: descripcionTrim ? descripcionTrim : undefined,
      fechaInicio,
      fechaFin,
      estimaciones,
    };
    const id = this.editandoId();
    const op = id === null ? this.api.create(dto) : this.api.update(id, dto);
    op.subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: id === null ? 'Proyecto creado' : 'Proyecto actualizado',
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

  eliminar(row: Proyecto): void {
    this.confirm.confirm({
      message: `¿Eliminar el proyecto "${row.nombre}"?`,
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
              summary: 'Proyecto eliminado',
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
