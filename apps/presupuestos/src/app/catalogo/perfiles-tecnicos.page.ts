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
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';

import { Rol } from '@operaciones/dominio';
import { ModalComponent, PreConfirm } from '@operaciones/ui/dialogos';
import {
  type DensidadLista,
  EmptyStateComponent,
  ErrorStateComponent,
  InlineEditComponent,
  ListPageComponent,
  ListToolbarComponent,
  LoadingStateComponent,
} from '@operaciones/ui/listado';
import { PageHeaderComponent } from '@operaciones/ui/shell';

import { PreIfRolDirective } from '../auth/pre-if-rol.directive';
import {
  leerDensidadInicial,
  leerFilasInicial,
  persistirDensidad,
  persistirFilas,
} from '../listado-prefs';
import { PerfilesTecnicosApi } from './catalogo.api';
import type { PerfilTecnico } from './catalogo.types';

const SECCION = 'perfiles-tecnicos';

@Component({
  selector: 'app-perfiles-tecnicos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    ModalComponent,
    ListPageComponent,
    ListToolbarComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    InlineEditComponent,
    PageHeaderComponent,
    PreIfRolDirective,
  ],
  templateUrl: './perfiles-tecnicos.page.html',
  styleUrl: '../lista-base.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilesTecnicosPage {
  private readonly api = inject(PerfilesTecnicosApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(PreConfirm);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly Rol = Rol;
  protected readonly perfiles = signal<PerfilTecnico[]>([]);
  protected readonly cargando = signal(false);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly dialogVisible = signal(false);
  protected readonly editandoId = signal<number | null>(null);

  protected readonly densidad = signal<DensidadLista>(leerDensidadInicial(SECCION));
  protected readonly filasPorPagina = signal<number>(leerFilasInicial(SECCION));

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly q = computed(() => this.queryParams().get('q') ?? '');

  protected readonly hayFiltrosActivos = computed(() => this.q().length > 0);

  protected readonly perfilesFiltrados = computed(() => {
    const lista = this.perfiles();
    const query = this.q().trim().toLowerCase();
    if (query.length === 0) return lista;
    return lista.filter((p) => p.nombre.toLowerCase().includes(query));
  });

  protected readonly resumen = computed(() => {
    const total = this.perfiles().length;
    const visibles = this.perfilesFiltrados().length;
    if (total === 0 || !this.hayFiltrosActivos()) return null;
    return `Mostrando ${visibles} de ${total}`;
  });

  protected readonly form: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
  });

  constructor() {
    this.cargar();
    effect(() => persistirDensidad(SECCION, this.densidad()));
    effect(() => persistirFilas(SECCION, this.filasPorPagina()));
  }

  protected onQueryChange(valor: string): void {
    this.actualizarParam('q', valor.trim() || null);
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
    this.api.list().subscribe({
      next: (rows) => {
        this.perfiles.set(rows);
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
    this.form.reset({ nombre: '' });
    this.dialogVisible.set(true);
  }

  abrirEditar(row: PerfilTecnico): void {
    this.editandoId.set(row.id);
    this.form.reset({ nombre: row.nombre });
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
    const dto = { nombre: this.form.value.nombre as string };
    const id = this.editandoId();
    const op = id === null ? this.api.create(dto) : this.api.update(id, dto);
    op.subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: id === null ? 'Perfil creado' : 'Perfil actualizado',
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

  guardarInline(row: PerfilTecnico, nuevoNombre: string): void {
    this.api.update(row.id, { nombre: nuevoNombre }).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: 'Perfil actualizado',
        });
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo actualizar',
          detail: extraerMensaje(err),
        });
      },
    });
  }

  async eliminar(row: PerfilTecnico): Promise<void> {
    const ok = await this.confirm.destructivo({
      titulo: 'Eliminar perfil técnico',
      mensaje: `¿Eliminar el perfil técnico "${row.nombre}"? Esta acción es irreversible.`,
      accionLabel: 'Eliminar perfil técnico',
    });
    if (!ok) return;
    this.api.delete(row.id).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: 'Perfil eliminado',
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
  const body = err.error as { message?: string | string[] } | undefined;
  if (Array.isArray(body?.message)) {
    return body.message.join(', ');
  }
  if (typeof body?.message === 'string') {
    return body.message;
  }
  return err.message;
}
