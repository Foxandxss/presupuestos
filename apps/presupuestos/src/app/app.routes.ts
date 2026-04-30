import { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard } from './auth/auth.guard';
import { LoginPage } from './auth/login.page';
import { PerfilesTecnicosPage } from './catalogo/perfiles-tecnicos.page';
import { ProveedoresPage } from './catalogo/proveedores.page';
import { RecursosPage } from './catalogo/recursos.page';
import { ServiciosPage } from './catalogo/servicios.page';
import { HomePage } from './home/home.page';
import { PlaceholderPage } from './placeholder/placeholder.page';
import { ProyectosPage } from './proyectos/proyectos.page';

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
    path: 'catalogo',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'proveedores' },
      {
        path: 'proveedores',
        component: ProveedoresPage,
        title: 'Proveedores · Presupuestos',
      },
      {
        path: 'perfiles-tecnicos',
        component: PerfilesTecnicosPage,
        title: 'Perfiles técnicos · Presupuestos',
      },
      {
        path: 'recursos',
        component: RecursosPage,
        title: 'Recursos · Presupuestos',
      },
      {
        path: 'servicios',
        component: ServiciosPage,
        title: 'Servicios · Presupuestos',
      },
    ],
  },
  {
    path: 'proyectos',
    component: ProyectosPage,
    canActivate: [authGuard],
    title: 'Proyectos · Presupuestos',
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
