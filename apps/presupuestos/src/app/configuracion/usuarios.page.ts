import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { TableLazyLoadEvent, TableModule } from 'primeng/table';

import { Rol as RolEnum } from '@operaciones/dominio';
import { ModalComponent } from '@operaciones/ui/dialogos';
import {
  type DensidadLista,
  EmptyStateComponent,
  ErrorStateComponent,
  ListPageComponent,
  ListToolbarComponent,
  LoadingStateComponent,
} from '@operaciones/ui/listado';
import { PageHeaderComponent } from '@operaciones/ui/shell';

import type { Rol } from '../auth/auth.types';
import {
  leerDensidadInicial,
  leerFilasInicial,
  persistirDensidad,
  persistirFilas,
} from '../listado-prefs';
import { UsuariosApi } from './usuarios.api';
import type { Usuario } from './usuarios.types';

const SECCION = 'usuarios';

interface OpcionRol {
  label: string;
  value: Rol;
}

const OPCIONES_ROL: OpcionRol[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'Consultor', value: 'consultor' },
];

const ROLES_VALIDOS = new Set<Rol>(['admin', 'consultor']);

@Component({
  selector: 'app-usuarios',
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
    PageHeaderComponent,
  ],
  templateUrl: './usuarios.page.html',
  styleUrl: '../lista-base.css',
  styles: [
    `
      .pre-usuarios__estado {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 500;
      }
      .pre-usuarios__estado--activo {
        background: var(--ok-soft, rgb(220 252 231));
        color: var(--ok-soft-text, rgb(22 101 52));
      }
      .pre-usuarios__estado--suspendido {
        background: rgb(254 215 170);
        color: rgb(154 52 18);
      }
      .pre-usuarios__estado--eliminado {
        background: rgb(226 232 240);
        color: rgb(51 65 85);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosPage {
  private readonly api = inject(UsuariosApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly Rol = RolEnum;
  protected readonly opcionesRol = OPCIONES_ROL;

  protected readonly cargando = signal(false);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly total = signal(0);
  protected readonly items = signal<Usuario[]>([]);
  protected readonly dialogVisible = signal(false);
  protected readonly guardando = signal(false);

  protected readonly densidad = signal<DensidadLista>(
    leerDensidadInicial(SECCION),
  );
  protected readonly filasPorPagina = signal<number>(leerFilasInicial(SECCION));
  protected readonly first = signal<number>(0);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly qFiltro = computed(
    () => this.queryParams().get('q') ?? '',
  );
  protected readonly rolFiltro = computed<Rol | null>(() => {
    const raw = this.queryParams().get('rol');
    return raw && ROLES_VALIDOS.has(raw as Rol) ? (raw as Rol) : null;
  });

  protected readonly hayFiltrosActivos = computed(
    () => this.qFiltro() !== '' || this.rolFiltro() !== null,
  );

  protected readonly resumen = computed(() => {
    const t = this.total();
    if (t === 0) return null;
    const visibles = this.items().length;
    const inicio = this.first() + 1;
    const fin = this.first() + visibles;
    return `${inicio}-${fin} de ${t}`;
  });

  protected readonly form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    rol: ['consultor' as Rol, [Validators.required]],
    passwordInicial: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    effect(() => {
      const filtros = {
        q: this.qFiltro(),
        rol: this.rolFiltro(),
        first: this.first(),
        rows: this.filasPorPagina(),
      };
      untracked(() => this.cargar(filtros));
    });
    effect(() => persistirDensidad(SECCION, this.densidad()));
    effect(() => persistirFilas(SECCION, this.filasPorPagina()));
  }

  protected etiquetaRol(rol: Rol): string {
    return rol === 'admin' ? 'Admin' : 'Consultor';
  }

  protected formatearFecha(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  }

  protected estadoUsuario(u: Usuario): {
    label: string;
    clase: 'activo' | 'suspendido' | 'eliminado';
  } {
    if (u.eliminadoEn) return { label: 'Eliminado', clase: 'eliminado' };
    if (u.suspendido) return { label: 'Suspendido', clase: 'suspendido' };
    return { label: 'Activo', clase: 'activo' };
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const next = event.first ?? 0;
    if (next !== this.first()) this.first.set(next);
    const rows = event.rows;
    if (rows && rows !== this.filasPorPagina()) this.filasPorPagina.set(rows);
  }

  protected onQueryChange(valor: string): void {
    this.first.set(0);
    this.actualizarParam('q', valor.trim() === '' ? null : valor.trim());
  }

  protected onRolChange(rol: Rol | null): void {
    this.first.set(0);
    this.actualizarParam('rol', rol);
  }

  protected onDensidadChange(d: DensidadLista): void {
    this.densidad.set(d);
  }

  protected limpiarFiltros(): void {
    this.first.set(0);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      queryParamsHandling: 'replace',
    });
  }

  protected reintentar(): void {
    this.cargar({
      q: this.qFiltro(),
      rol: this.rolFiltro(),
      first: this.first(),
      rows: this.filasPorPagina(),
    });
  }

  protected abrirCrear(): void {
    this.form.reset({
      email: '',
      nombre: '',
      rol: 'consultor',
      passwordInicial: '',
    });
    this.dialogVisible.set(true);
  }

  protected cerrarDialog(): void {
    this.dialogVisible.set(false);
  }

  protected guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    const dto = {
      email: (this.form.value.email as string).trim().toLowerCase(),
      nombre: (this.form.value.nombre as string).trim(),
      rol: this.form.value.rol as Rol,
      passwordInicial: this.form.value.passwordInicial as string,
    };
    this.api.create(dto).subscribe({
      next: (creado) => {
        this.guardando.set(false);
        this.dialogVisible.set(false);
        this.toast.add({
          severity: 'success',
          summary: 'Usuario creado',
          detail: `${creado.email} ya puede iniciar sesión.`,
        });
        // Recargar la pagina actual: el nuevo usuario tiene el id mas alto y
        // por lo tanto aparece primero (orden por id desc).
        this.first.set(0);
        this.cargar({
          q: this.qFiltro(),
          rol: this.rolFiltro(),
          first: 0,
          rows: this.filasPorPagina(),
        });
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo crear el usuario',
          detail: extraerMensaje(err),
        });
      },
    });
  }

  private actualizarParam(clave: string, valor: string | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [clave]: valor },
      queryParamsHandling: 'merge',
    });
  }

  private cargar(filtros: {
    q: string;
    rol: Rol | null;
    first: number;
    rows: number;
  }): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.api
      .list({
        limit: filtros.rows,
        offset: filtros.first,
        q: filtros.q || undefined,
        rol: filtros.rol ?? undefined,
      })
      .subscribe({
        next: (pagina) => {
          this.items.set(pagina.items);
          this.total.set(pagina.total);
          this.cargando.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.cargando.set(false);
          this.errorCarga.set(extraerMensaje(err));
        },
      });
  }
}

function extraerMensaje(err: HttpErrorResponse): string {
  const body = err.error as { message?: string | string[] } | undefined;
  if (Array.isArray(body?.message)) return body.message.join(', ');
  if (typeof body?.message === 'string') return body.message;
  return err.message;
}
