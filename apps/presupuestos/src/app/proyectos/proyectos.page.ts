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
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { forkJoin } from 'rxjs';

import { Rol } from '@operaciones/dominio';
import { ModalComponent, PreConfirm } from '@operaciones/ui/dialogos';
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
import { PerfilesTecnicosApi } from '../catalogo/catalogo.api';
import type { PerfilTecnico } from '../catalogo/catalogo.types';
import {
  leerDensidadInicial,
  leerFilasInicial,
  persistirDensidad,
  persistirFilas,
} from '../listado-prefs';
import { ProyectosApi } from './proyectos.api';
import type {
  CrearEstimacion,
  CrearProyecto,
  EstimacionPerfil,
  Proyecto,
} from './proyectos.types';

const SECCION = 'proyectos';
type EstadoProyecto = 'activo' | 'cerrado';

const ESTADO_OPCIONES: { label: string; value: EstadoProyecto }[] = [
  { label: 'Activo', value: 'activo' },
  { label: 'Cerrado', value: 'cerrado' },
];

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    DatePickerModule,
    SelectModule,
    ModalComponent,
    ListPageComponent,
    ListToolbarComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    PreIfRolDirective,
  ],
  templateUrl: './proyectos.page.html',
  styleUrl: '../lista-base.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProyectosPage {
  private readonly api = inject(ProyectosApi);
  private readonly perfilesApi = inject(PerfilesTecnicosApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(PreConfirm);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly Rol = Rol;
  protected readonly proyectos = signal<Proyecto[]>([]);
  protected readonly perfiles = signal<PerfilTecnico[]>([]);
  protected readonly cargando = signal(false);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly dialogVisible = signal(false);
  protected readonly editandoId = signal<number | null>(null);

  protected readonly densidad = signal<DensidadLista>(leerDensidadInicial(SECCION));
  protected readonly filasPorPagina = signal<number>(leerFilasInicial(SECCION));

  protected readonly estadoOpciones = ESTADO_OPCIONES;

  protected readonly perfilesPorId = computed(() => {
    const map = new Map<number, string>();
    for (const p of this.perfiles()) map.set(p.id, p.nombre);
    return map;
  });

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly q = computed(() => this.queryParams().get('q') ?? '');
  protected readonly estadoFiltro = computed<EstadoProyecto | null>(() => {
    const raw = this.queryParams().get('estado');
    return raw === 'activo' || raw === 'cerrado' ? raw : null;
  });

  protected readonly hayFiltrosActivos = computed(
    () => this.q().length > 0 || this.estadoFiltro() !== null,
  );

  protected readonly proyectosFiltrados = computed(() => {
    const lista = this.proyectos();
    const query = this.q().trim().toLowerCase();
    const estado = this.estadoFiltro();
    const hoy = formatISODate(new Date());
    return lista.filter((p) => {
      if (estado !== null) {
        const estaActivo = !p.fechaFin || p.fechaFin > hoy;
        if (estado === 'activo' && !estaActivo) return false;
        if (estado === 'cerrado' && estaActivo) return false;
      }
      if (query.length > 0 && !p.nombre.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  });

  protected readonly resumen = computed(() => {
    const total = this.proyectos().length;
    const visibles = this.proyectosFiltrados().length;
    if (total === 0 || !this.hayFiltrosActivos()) return null;
    return `Mostrando ${visibles} de ${total}`;
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
    effect(() => persistirDensidad(SECCION, this.densidad()));
    effect(() => persistirFilas(SECCION, this.filasPorPagina()));
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

  estaActivo(p: Proyecto): boolean {
    if (!p.fechaFin) return true;
    return p.fechaFin > formatISODate(new Date());
  }

  protected onQueryChange(valor: string): void {
    this.actualizarParam('q', valor.trim() || null);
  }

  protected onEstadoChange(valor: EstadoProyecto | null): void {
    this.actualizarParam('estado', valor ?? null);
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

  protected onRowClick(row: Proyecto): void {
    void this.router.navigate(['/proyectos', row.id]);
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
        this.errorCarga.set(extraerMensaje(err));
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

  async eliminar(row: Proyecto): Promise<void> {
    const ok = await this.confirm.destructivo({
      titulo: 'Eliminar proyecto',
      mensaje: `¿Eliminar el proyecto "${row.nombre}"? Esta acción es irreversible.`,
      accionLabel: 'Eliminar proyecto',
    });
    if (!ok) return;
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
