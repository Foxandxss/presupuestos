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
    const catalogo: MenuItem = {
      label: 'Catálogo',
      icon: 'pi pi-list',
      items: [
        { label: 'Proveedores', routerLink: '/catalogo/proveedores' },
        {
          label: 'Perfiles técnicos',
          routerLink: '/catalogo/perfiles-tecnicos',
        },
        { label: 'Recursos', routerLink: '/catalogo/recursos' },
        { label: 'Servicios', routerLink: '/catalogo/servicios' },
      ],
    };
    const proyectos: MenuItem = {
      label: 'Proyectos',
      icon: 'pi pi-briefcase',
      routerLink: '/proyectos',
    };
    const pedidos: MenuItem = {
      label: 'Pedidos',
      icon: 'pi pi-file',
      routerLink: '/pedidos',
    };
    const consumos: MenuItem = {
      label: 'Consumos',
      icon: 'pi pi-clock',
      routerLink: '/consumos',
    };
    const items: MenuItem[] = [inicio, catalogo, proyectos, pedidos, consumos];
    if (rol === 'admin') {
      items.push({
        label: 'Reportes',
        icon: 'pi pi-chart-bar',
        items: [
          { label: 'Pedidos', routerLink: '/reportes/pedidos' },
          {
            label: 'Estimadas vs Consumidas',
            routerLink: '/reportes/horas',
          },
          { label: 'Facturación mensual', routerLink: '/reportes/facturacion' },
        ],
      });
    }
    return items;
  });

  cerrarSesion(): void {
    this.auth.logout();
  }

  irALogin(): void {
    void this.router.navigateByUrl('/login');
  }
}
