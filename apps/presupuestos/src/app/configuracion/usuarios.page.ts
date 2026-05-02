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

import { AuthService } from '../auth/auth.service';
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
      .pre-usuarios__reset-result {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        border-radius: 8px;
        background: var(--surface-100, rgb(248 250 252));
      }
      .pre-usuarios__reset-result code {
        display: block;
        padding: 8px 12px;
        background: white;
        border: 1px solid var(--surface-200, rgb(226 232 240));
        border-radius: 6px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        word-break: break-all;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosPage {
  private readonly api = inject(UsuariosApi);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(PreConfirm);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly Rol = RolEnum;
  protected readonly opcionesRol = OPCIONES_ROL;

  protected readonly cargando = signal(false);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly total = signal(0);
  protected readonly items = signal<Usuario[]>([]);
  protected readonly dialogVisible = signal(false);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly guardando = signal(false);

  protected readonly resetPasswordVisible = signal(false);
  protected readonly resetPasswordTarget = signal<Usuario | null>(null);
  protected readonly reseteandoPassword = signal(false);
  // Cuando el reset es exitoso guardamos la password generada para mostrarla
  // y permitir copiarla al portapapeles. Se borra al cerrar el modal.
  protected readonly resetPasswordResultado = signal<string | null>(null);

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

  protected readonly editForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    rol: ['consultor' as Rol, [Validators.required]],
  });

  protected readonly resetForm: FormGroup = this.fb.group({
    nuevaPassword: ['', [Validators.required, Validators.minLength(8)]],
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

  protected esUsuarioActual(u: Usuario): boolean {
    return this.auth.usuario()?.id === u.id;
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
    this.editandoId.set(null);
    this.form.reset({
      email: '',
      nombre: '',
      rol: 'consultor',
      passwordInicial: '',
    });
    this.dialogVisible.set(true);
  }

  protected abrirEditar(row: Usuario): void {
    this.editandoId.set(row.id);
    this.editForm.reset({ nombre: row.nombre, rol: row.rol });
    this.dialogVisible.set(true);
  }

  protected cerrarDialog(): void {
    this.dialogVisible.set(false);
  }

  protected guardar(): void {
    if (this.editandoId() === null) {
      this.guardarCrear();
    } else {
      this.guardarEditar();
    }
  }

  private guardarCrear(): void {
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

  private guardarEditar(): void {
    const id = this.editandoId();
    if (id === null) return;
    if (this.editForm.invalid || this.guardando()) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    const dto = {
      nombre: (this.editForm.value.nombre as string).trim(),
      rol: this.editForm.value.rol as Rol,
    };
    this.api.update(id, dto).subscribe({
      next: () => {
        this.guardando.set(false);
        this.dialogVisible.set(false);
        this.toast.add({
          severity: 'success',
          summary: 'Usuario actualizado',
        });
        this.recargarPaginaActual();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo actualizar el usuario',
          detail: extraerMensaje(err),
        });
      },
    });
  }

  protected abrirResetPassword(row: Usuario): void {
    this.resetPasswordTarget.set(row);
    this.resetPasswordResultado.set(null);
    this.resetForm.reset({ nuevaPassword: '' });
    this.resetPasswordVisible.set(true);
  }

  protected cerrarResetPassword(): void {
    this.resetPasswordVisible.set(false);
    this.resetPasswordTarget.set(null);
    this.resetPasswordResultado.set(null);
  }

  protected guardarResetPassword(): void {
    const target = this.resetPasswordTarget();
    if (!target) return;
    if (this.resetForm.invalid || this.reseteandoPassword()) {
      this.resetForm.markAllAsTouched();
      return;
    }
    const nuevaPassword = this.resetForm.value.nuevaPassword as string;
    this.reseteandoPassword.set(true);
    this.api.resetPassword(target.id, { nuevaPassword }).subscribe({
      next: () => {
        this.reseteandoPassword.set(false);
        // No cerramos el modal: enseñamos la nueva password con boton de copia
        // para que el admin pueda entregarsela al usuario por canal externo.
        this.resetPasswordResultado.set(nuevaPassword);
        this.toast.add({
          severity: 'success',
          summary: 'Contraseña actualizada',
          detail: 'Cópiala y entrégala al usuario por canal externo.',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.reseteandoPassword.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo resetear la contraseña',
          detail: extraerMensaje(err),
        });
      },
    });
  }

  protected async copiarPassword(): Promise<void> {
    const password = this.resetPasswordResultado();
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      this.toast.add({
        severity: 'info',
        summary: 'Contraseña copiada al portapapeles',
      });
    } catch {
      this.toast.add({
        severity: 'warn',
        summary: 'No se pudo copiar automáticamente',
        detail: 'Selecciona el texto manualmente.',
      });
    }
  }

  protected async toggleSuspender(row: Usuario): Promise<void> {
    const accion = row.suspendido ? 'reactivar' : 'suspender';
    const ok = await this.confirm.normal({
      titulo: row.suspendido ? 'Reactivar usuario' : 'Suspender usuario',
      mensaje: row.suspendido
        ? `¿Reactivar a "${row.email}"? Podrá volver a iniciar sesión.`
        : `¿Suspender a "${row.email}"? No podrá iniciar sesión hasta que lo reactives.`,
      accionLabel: row.suspendido ? 'Reactivar' : 'Suspender',
    });
    if (!ok) return;
    this.api.suspender(row.id, { suspendido: !row.suspendido }).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: row.suspendido ? 'Usuario reactivado' : 'Usuario suspendido',
        });
        this.recargarPaginaActual();
      },
      error: (err: HttpErrorResponse) => {
        this.toast.add({
          severity: 'error',
          summary: `No se pudo ${accion} el usuario`,
          detail: extraerMensaje(err),
        });
      },
    });
  }

  protected async eliminar(row: Usuario): Promise<void> {
    const ok = await this.confirm.destructivo({
      titulo: 'Eliminar usuario',
      mensaje: `¿Eliminar a "${row.email}"? Quedará oculto del listado y no podrá iniciar sesión. Sus consumos y movimientos históricos se conservan.`,
      accionLabel: 'Eliminar usuario',
    });
    if (!ok) return;
    this.api.delete(row.id).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: 'Usuario eliminado',
        });
        this.recargarPaginaActual();
      },
      error: (err: HttpErrorResponse) => {
        this.toast.add({
          severity: 'error',
          summary: 'No se pudo eliminar el usuario',
          detail: extraerMensaje(err),
        });
      },
    });
  }

  private recargarPaginaActual(): void {
    this.cargar({
      q: this.qFiltro(),
      rol: this.rolFiltro(),
      first: this.first(),
      rows: this.filasPorPagina(),
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
