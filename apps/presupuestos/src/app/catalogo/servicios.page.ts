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
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';

import { Rol } from '@operaciones/dominio';
import {
  ModalComponent,
  PreConfirm,
  PreFieldComponent,
} from '@operaciones/ui/dialogos';
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
  leerDensidadInicial,
  leerFilasInicial,
  persistirDensidad,
  persistirFilas,
} from '../listado-prefs';
import {
  PerfilesTecnicosApi,
  ProveedoresApi,
  ServiciosApi,
} from './catalogo.api';
import type {
  PerfilTecnico,
  Proveedor,
  Servicio,
} from './catalogo.types';

const SECCION = 'servicios';

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputNumberModule,
    SelectModule,
    ModalComponent,
    PreFieldComponent,
    ListPageComponent,
    ListToolbarComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    PreIfRolDirective,
  ],
  templateUrl: './servicios.page.html',
  styleUrl: '../lista-base.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiciosPage {
  private readonly api = inject(ServiciosApi);
  private readonly proveedoresApi = inject(ProveedoresApi);
  private readonly perfilesApi = inject(PerfilesTecnicosApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(PreConfirm);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly Rol = Rol;
  protected readonly servicios = signal<Servicio[]>([]);
  protected readonly proveedores = signal<Proveedor[]>([]);
  protected readonly perfiles = signal<PerfilTecnico[]>([]);
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
  protected readonly perfilesPorId = computed(() => {
    const map = new Map<number, string>();
    for (const p of this.perfiles()) map.set(p.id, p.nombre);
    return map;
  });

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly proveedorFiltro = computed<number | null>(() => {
    const raw = this.queryParams().get('proveedor');
    const n = raw ? Number(raw) : null;
    return n && Number.isFinite(n) ? n : null;
  });
  protected readonly perfilFiltro = computed<number | null>(() => {
    const raw = this.queryParams().get('perfil');
    const n = raw ? Number(raw) : null;
    return n && Number.isFinite(n) ? n : null;
  });

  protected readonly hayFiltrosActivos = computed(
    () => this.proveedorFiltro() !== null || this.perfilFiltro() !== null,
  );

  protected readonly serviciosFiltrados = computed(() => {
    const lista = this.servicios();
    const proveedorId = this.proveedorFiltro();
    const perfilId = this.perfilFiltro();
    return lista.filter((s) => {
      if (proveedorId !== null && s.proveedorId !== proveedorId) return false;
      if (perfilId !== null && s.perfilTecnicoId !== perfilId) return false;
      return true;
    });
  });

  protected readonly resumen = computed(() => {
    const total = this.servicios().length;
    const visibles = this.serviciosFiltrados().length;
    if (total === 0 || !this.hayFiltrosActivos()) return null;
    return `Mostrando ${visibles} de ${total}`;
  });

  protected readonly form: FormGroup = this.fb.group({
    proveedorId: [null as number | null, [Validators.required]],
    perfilTecnicoId: [null as number | null, [Validators.required]],
    tarifaPorHora: [
      null as number | null,
      [Validators.required, Validators.min(0)],
    ],
  });

  constructor() {
    this.cargar();
    effect(() => persistirDensidad(SECCION, this.densidad()));
    effect(() => persistirFilas(SECCION, this.filasPorPagina()));
  }

  nombreProveedor(id: number): string {
    return this.proveedoresPorId().get(id) ?? `#${id}`;
  }

  nombrePerfil(id: number): string {
    return this.perfilesPorId().get(id) ?? `#${id}`;
  }

  protected onProveedorChange(valor: number | null): void {
    this.actualizarParam('proveedor', valor ? String(valor) : null);
  }

  protected onPerfilChange(valor: number | null): void {
    this.actualizarParam('perfil', valor ? String(valor) : null);
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
      servicios: this.api.list(),
      proveedores: this.proveedoresApi.list(),
      perfiles: this.perfilesApi.list(),
    }).subscribe({
      next: ({ servicios, proveedores, perfiles }) => {
        this.servicios.set(servicios);
        this.proveedores.set(proveedores);
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
    this.form.reset({
      proveedorId: null,
      perfilTecnicoId: null,
      tarifaPorHora: null,
    });
    this.dialogVisible.set(true);
  }

  abrirEditar(row: Servicio): void {
    this.editandoId.set(row.id);
    this.form.reset({
      proveedorId: row.proveedorId,
      perfilTecnicoId: row.perfilTecnicoId,
      tarifaPorHora: row.tarifaPorHora,
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
    const dto = {
      proveedorId: this.form.value.proveedorId as number,
      perfilTecnicoId: this.form.value.perfilTecnicoId as number,
      tarifaPorHora: this.form.value.tarifaPorHora as number,
    };
    const id = this.editandoId();
    const op = id === null ? this.api.create(dto) : this.api.update(id, dto);
    op.subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: id === null ? 'Servicio creado' : 'Servicio actualizado',
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

  async eliminar(row: Servicio): Promise<void> {
    const ok = await this.confirm.destructivo({
      titulo: 'Eliminar servicio',
      mensaje: `¿Eliminar el servicio ${this.nombreProveedor(row.proveedorId)} · ${this.nombrePerfil(row.perfilTecnicoId)}? Esta acción es irreversible.`,
      accionLabel: 'Eliminar servicio',
    });
    if (!ok) return;
    this.api.delete(row.id).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: 'Servicio eliminado',
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
