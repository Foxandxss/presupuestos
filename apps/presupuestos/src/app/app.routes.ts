import { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard } from './auth/auth.guard';
import { LoginPage } from './auth/login.page';
import { PerfilesTecnicosPage } from './catalogo/perfiles-tecnicos.page';
import { ProveedoresPage } from './catalogo/proveedores.page';
import { RecursosPage } from './catalogo/recursos.page';
import { ServiciosPage } from './catalogo/servicios.page';
import { ConsumosPage } from './consumos/consumos.page';
import { HomePage } from './home/home.page';
import { PedidosPage } from './pedidos/pedidos.page';
import { ProyectosPage } from './proyectos/proyectos.page';
import { ReporteFacturacionPage } from './reportes/reporte-facturacion.page';
import { ReporteHorasPage } from './reportes/reporte-horas.page';
import { ReportePedidosPage } from './reportes/reporte-pedidos.page';

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
    path: 'pedidos',
    component: PedidosPage,
    canActivate: [authGuard],
    title: 'Pedidos · Presupuestos',
  },
  {
    path: 'consumos',
    component: ConsumosPage,
    canActivate: [authGuard],
    title: 'Consumos · Presupuestos',
  },
  {
    path: 'reportes',
    canActivate: [authGuard, roleGuard('admin')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'pedidos' },
      {
        path: 'pedidos',
        component: ReportePedidosPage,
        title: 'Reporte de pedidos · Presupuestos',
      },
      {
        path: 'horas',
        component: ReporteHorasPage,
        title: 'Estimadas vs Consumidas · Presupuestos',
      },
      {
        path: 'facturacion',
        component: ReporteFacturacionPage,
        title: 'Facturación mensual · Presupuestos',
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: '**', redirectTo: 'inicio' },
];
