import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MenubarModule } from 'primeng/menubar';
import { PrimeTemplate } from 'primeng/api';
import type { MenuItem } from 'primeng/api';

import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MenubarModule, ButtonModule, PrimeTemplate],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly title = 'presupuestos';
  protected readonly autenticado = this.auth.autenticado;
  protected readonly usuario = this.auth.usuario;

  protected readonly menuItems = computed<MenuItem[]>(() => {
    const rol = this.auth.rol();
    if (!rol) {
      return [];
    }
    const inicio: MenuItem = {
      label: 'Inicio',
      icon: 'pi pi-home',
      routerLink: '/inicio',
    };
    if (rol === 'admin') {
      return [
        inicio,
        {
          label: 'Catálogo',
          icon: 'pi pi-list',
          routerLink: '/admin/catalogo',
        },
      ];
    }
    return [
      inicio,
      {
        label: 'Mis consumos',
        icon: 'pi pi-clock',
        routerLink: '/consultor/consumos',
      },
    ];
  });

  cerrarSesion(): void {
    this.auth.logout();
  }

  irALogin(): void {
    void this.router.navigateByUrl('/login');
  }
}
