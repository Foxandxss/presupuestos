import { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard } from './auth/auth.guard';
import { LoginPage } from './auth/login.page';
import { HomePage } from './home/home.page';
import { PlaceholderPage } from './placeholder/placeholder.page';

export const appRoutes: Routes = [
  {
    path: 'login',
    component: LoginPage,
    canActivate: [guestGuard],
    title: 'Iniciar sesión · Presupuestos',
  },
  {
    path: 'inicio',
    component: HomePage,
    canActivate: [authGuard],
    title: 'Inicio · Presupuestos',
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard('admin')],
    children: [
      {
        path: 'catalogo',
        component: PlaceholderPage,
        data: { titulo: 'Catálogo' },
      },
    ],
  },
  {
    path: 'consultor',
    canActivate: [authGuard, roleGuard('consultor')],
    children: [
      {
        path: 'consumos',
        component: PlaceholderPage,
        data: { titulo: 'Mis consumos' },
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: '**', redirectTo: 'inicio' },
];
