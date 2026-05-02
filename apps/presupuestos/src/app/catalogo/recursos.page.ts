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
import { forkJoin } from 'rxjs';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
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
import { ProveedoresApi, RecursosApi } from './catalogo.api';
import type { Proveedor, Recurso } from './catalogo.types';

const SECCION = 'recursos';

@Component({
  selector: 'app-recursos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
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
  templateUrl: './recursos.page.html',
  styleUrl: '../lista-base.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecursosPage {
  private readonly api = inject(RecursosApi);
  private readonly proveedoresApi = inject(ProveedoresApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(PreConfirm);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly Rol = Rol;
  protected readonly recursos = signal<Recurso[]>([]);
  protected readonly proveedores = signal<Proveedor[]>([]);
  protected readonly cargando = signal(false);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly dialogVisible = signal(false);
  protected readonly editandoId = signal<number | null>(null);

  protected readonly densidad = signal<DensidadLista>(leerDensidadInicial(SECCION));
  protected readonly filasPorPagina = signal<number>(leerFilasInicial(SECCION));

  protected readonly proveedoresPorId = computed(() => {
    const map = new Map<number, string>();
    for (const p of this.proveedores()) map.set(p.id, p.nombre);
    return map;
  });

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly q = computed(() => this.queryParams().get('q') ?? '');
  protected readonly proveedorFiltro = computed<number | null>(() => {
    const raw = this.queryParams().get('proveedor');
    const n = raw ? Number(raw) : null;
    return n && Number.isFinite(n) ? n : null;
  });

  protected readonly hayFiltrosActivos = computed(
    () => this.q().length > 0 || this.proveedorFiltro() !== null,
  );

  protected readonly recursosFiltrados = computed(() => {
    const lista = this.recursos();
    const query = this.q().trim().toLowerCase();
    const proveedorId = this.proveedorFiltro();
    return lista.filter((r) => {
      if (proveedorId !== null && r.proveedorId !== proveedorId) return false;
      if (query.length > 0 && !r.nombre.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  });

  protected readonly resumen = computed(() => {
    const total = this.recursos().length;
    const visibles = this.recursosFiltrados().length;
    if (total === 0 || !this.hayFiltrosActivos()) return null;
    return `Mostrando ${visibles} de ${total}`;
  });

  protected readonly form: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    proveedorId: [null as number | null, [Validators.required]],
  });

  constructor() {
    this.cargar();
    effect(() => persistirDensidad(SECCION, this.densidad()));
    effect(() => persistirFilas(SECCION, this.filasPorPagina()));
  }

  nombreProveedor(id: number): string {
    return this.proveedoresPorId().get(id) ?? `#${id}`;
  }

  protected onQueryChange(valor: string): void {
    this.actualizarParam('q', valor.trim() || null);
  }

  protected onProveedorChange(valor: number | null): void {
    this.actualizarParam('proveedor', valor ? String(valor) : null);
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
    forkJoin({
      recursos: this.api.list(),
      proveedores: this.proveedoresApi.list(),
    }).subscribe({
      next: ({ recursos, proveedores }) => {
        this.recursos.set(recursos);
        this.proveedores.set(proveedores);
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
    this.form.reset({ nombre: '', proveedorId: null });
    this.dialogVisible.set(true);
  }

  abrirEditar(row: Recurso): void {
    this.editandoId.set(row.id);
    this.form.reset({ nombre: row.nombre, proveedorId: row.proveedorId });
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
    const dto = {
      nombre: this.form.value.nombre as string,
      proveedorId: this.form.value.proveedorId as number,
    };
    const id = this.editandoId();
    const op = id === null ? this.api.create(dto) : this.api.update(id, dto);
    op.subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: id === null ? 'Recurso creado' : 'Recurso actualizado',
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

  guardarInline(row: Recurso, nuevoNombre: string): void {
    this.api.update(row.id, { nombre: nuevoNombre }).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: 'Recurso actualizado',
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

  async eliminar(row: Recurso): Promise<void> {
    const ok = await this.confirm.destructivo({
      titulo: 'Eliminar recurso',
      mensaje: `¿Eliminar el recurso "${row.nombre}"? Esta acción es irreversible.`,
      accionLabel: 'Eliminar recurso',
    });
    if (!ok) return;
    this.api.delete(row.id).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: 'Recurso eliminado',
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
