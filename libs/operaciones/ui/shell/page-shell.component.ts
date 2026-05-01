import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { LucideAngularModule, type LucideIconData } from 'lucide-angular';
import { filter, map, startWith } from 'rxjs/operators';

import type { Rol } from '../../dominio';
import { ICONOS, type NombreIcono } from '../iconos';

import {
  construirBreadcrumbs,
  ITEM_INICIO,
  NAV_GROUPS,
  type NavGroup,
  type NavItem,
} from './nav-config';

const STORAGE_KEY_COLAPSADO = 'presupuestos.sidebar-colapsado';

export interface UsuarioShell {
  readonly nombre?: string | null;
  readonly email: string;
  readonly rol: Rol;
}

function leerColapsadoInicial(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY_COLAPSADO) === '1';
}

@Component({
  selector: 'pre-page-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './page-shell.component.html',
  styleUrl: './page-shell.component.css',
})
export class PageShellComponent {
  readonly usuario = input.required<UsuarioShell>();
  readonly logout = output<void>();

  private readonly router = inject(Router);
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  protected readonly icono = ICONOS;
  protected readonly itemInicio = ITEM_INICIO;

  protected readonly colapsado = signal(leerColapsadoInicial());
  protected readonly menuAbierto = signal(false);

  private readonly urlActual = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly grupos = computed<readonly NavGroup[]>(() => {
    const rol = this.usuario().rol;
    return NAV_GROUPS.filter(
      (g) => !g.rolesPermitidos || g.rolesPermitidos.includes(rol),
    );
  });

  protected readonly breadcrumbs = computed(() =>
    construirBreadcrumbs(this.urlActual()),
  );

  protected readonly iniciales = computed(() => {
    const u = this.usuario();
    const nombre = u.nombre?.trim();
    if (nombre) {
      const partes = nombre.split(/\s+/).filter(Boolean);
      return (
        (partes[0]?.[0] ?? '').toUpperCase() +
        (partes[1]?.[0] ?? '').toUpperCase()
      );
    }
    return (u.email[0] ?? '?').toUpperCase();
  });

  protected readonly nombreMostrado = computed(() => {
    const u = this.usuario();
    return u.nombre?.trim() || u.email.split('@')[0];
  });

  protected readonly chipRolClase = computed(() =>
    this.usuario().rol === 'admin'
      ? 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)]'
      : 'bg-slate-100 text-slate-700',
  );

  protected readonly chipRolLabel = computed(() =>
    this.usuario().rol === 'admin' ? 'Admin' : 'Consultor',
  );

  protected toggleColapso(): void {
    const proximo = !this.colapsado();
    this.colapsado.set(proximo);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_COLAPSADO, proximo ? '1' : '0');
    }
  }

  protected toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.menuAbierto.update((v) => !v);
  }

  protected cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  protected emitirLogout(): void {
    this.cerrarMenu();
    this.logout.emit();
  }

  protected iconoItem(nombre: NombreIcono): LucideIconData {
    return this.icono[nombre] as LucideIconData;
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.menuAbierto()) return;
    const dentro = this.hostRef.nativeElement.contains(event.target as Node);
    if (!dentro) {
      this.cerrarMenu();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.menuAbierto()) this.cerrarMenu();
  }

  protected esItemInicioActivo(): boolean {
    return this.urlActual().startsWith('/inicio');
  }

  protected trackGrupo(_: number, g: NavGroup): string {
    return g.label;
  }

  protected trackItem(_: number, i: NavItem): string {
    return i.ruta;
  }
}
