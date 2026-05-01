import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, type LucideIconData } from 'lucide-angular';
import { MessageService } from 'primeng/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Rol } from '@operaciones/dominio';
import { mapearErrorACopy } from '@operaciones/ui/errores';
import { ICONOS } from '@operaciones/ui/iconos';
import {
  ErrorStateComponent,
  LoadingStateComponent,
} from '@operaciones/ui/listado';

import { AuthService } from '../auth/auth.service';
import { PreIfRolDirective } from '../auth/pre-if-rol.directive';
import { ConsumoDrawerComponent } from '../consumos/consumo-drawer.component';
import { ConsumosApi } from '../consumos/consumos.api';
import type { Consumo } from '../consumos/consumos.types';
import { PerfilesTecnicosApi, RecursosApi } from '../catalogo/catalogo.api';
import type { PerfilTecnico, Recurso } from '../catalogo/catalogo.types';
import { PedidosApi } from '../pedidos/pedidos.api';
import type { Pedido } from '../pedidos/pedidos.types';

import { InicioApi } from './inicio.api';
import type {
  ActividadEvento,
  KpisAdmin,
  KpisConsultor,
  TipoActividad,
} from './inicio.types';

interface KpiTile {
  etiqueta: string;
  valor: string;
  icono: LucideIconData;
  delta?: { porcentaje: number; positivo: boolean } | null;
  href?: string | null;
}

interface AccionRapida {
  label: string;
  icono: LucideIconData;
  rolesPermitidos: readonly Rol[];
  ejecutar: () => void;
  badge?: number | null;
}

const COLOR_POR_TIPO: Record<TipoActividad, string> = {
  pedido_creado: '#6366f1',
  pedido_solicitado: '#f59e0b',
  pedido_aprobado: '#0ea5e9',
  pedido_actualizado: '#64748b',
  consumo_registrado: '#10b981',
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideAngularModule,
    ErrorStateComponent,
    LoadingStateComponent,
    PreIfRolDirective,
    ConsumoDrawerComponent,
  ],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly auth = inject(AuthService);
  private readonly api = inject(InicioApi);
  private readonly pedidosApi = inject(PedidosApi);
  private readonly consumosApi = inject(ConsumosApi);
  private readonly perfilesApi = inject(PerfilesTecnicosApi);
  private readonly recursosApi = inject(RecursosApi);
  private readonly toast = inject(MessageService);
  private readonly router = inject(Router);

  protected readonly Rol = Rol;

  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly kpisAdmin = signal<KpisAdmin | null>(null);
  protected readonly kpisConsultor = signal<KpisConsultor | null>(null);
  protected readonly actividad = signal<ActividadEvento[]>([]);

  protected readonly drawerAbierto = signal(false);
  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly perfiles = signal<PerfilTecnico[]>([]);
  protected readonly recursos = signal<Recurso[]>([]);
  protected readonly consumosCache = signal<Consumo[]>([]);

  protected readonly rol = computed<Rol | null>(() => this.auth.rol());
  protected readonly saludo = computed<string>(() => {
    const hora = new Date().getHours();
    const nombre = this.nombreUsuario();
    if (hora < 6) return `Buenas noches, ${nombre}`;
    if (hora < 13) return `Buenos días, ${nombre}`;
    if (hora < 21) return `Buenas tardes, ${nombre}`;
    return `Buenas noches, ${nombre}`;
  });
  protected readonly fechaHoy = computed<string>(() => formatearFechaHoy());

  protected readonly tilesAdmin = computed<KpiTile[]>(() => {
    const k = this.kpisAdmin();
    if (!k) return [];
    return [
      {
        etiqueta: 'Pendientes de aprobación',
        valor: String(k.pendientesAprobacion),
        icono: ICONOS.solicitar as LucideIconData,
        href: '/pedidos?estado=Solicitado',
      },
      {
        etiqueta: 'En ejecución',
        valor: String(k.enEjecucion),
        icono: ICONOS.consumos as LucideIconData,
        href: '/pedidos?estado=EnEjecucion',
      },
      {
        etiqueta: 'Facturación del mes',
        valor: formatearImporte(k.facturacionMes),
        icono: ICONOS.facturacion as LucideIconData,
        delta:
          k.facturacionMesDelta !== null
            ? {
                porcentaje: Math.abs(k.facturacionMesDelta),
                positivo: k.facturacionMesDelta >= 0,
              }
            : null,
        href: '/reportes/facturacion',
      },
      {
        etiqueta: 'Horas mes consumidas',
        valor: formatearHoras(k.horasMesConsumidas),
        icono: ICONOS.calendario as LucideIconData,
        href: '/consumos',
      },
    ];
  });

  protected readonly tilesConsultor = computed<KpiTile[]>(() => {
    const k = this.kpisConsultor();
    if (!k) return [];
    return [
      {
        etiqueta: 'En ejecución',
        valor: String(k.enEjecucion),
        icono: ICONOS.consumos as LucideIconData,
        href: '/pedidos?estado=EnEjecucion',
      },
      {
        etiqueta: 'Consumos del mes',
        valor: String(k.consumosDelMes),
        icono: ICONOS.calendario as LucideIconData,
        href: '/consumos',
      },
      {
        etiqueta: 'Líneas que cierran este mes',
        valor: String(k.lineasQueCierranEsteMes),
        icono: ICONOS.advertencia as LucideIconData,
        href: '/pedidos',
      },
      {
        etiqueta: 'Mis horas consumidas',
        valor: formatearHoras(k.misHorasConsumidasMes),
        icono: ICONOS.actividad as LucideIconData,
        href: '/consumos',
      },
    ];
  });

  protected readonly accionesRapidas = computed<AccionRapida[]>(() => {
    const r = this.rol();
    if (r === 'admin') {
      const pendientes = this.kpisAdmin()?.pendientesAprobacion ?? 0;
      return [
        {
          label: 'Crear pedido',
          icono: ICONOS.crear as LucideIconData,
          rolesPermitidos: ['admin'] as const,
          ejecutar: () => this.irA('/pedidos'),
        },
        {
          label: 'Aprobar pendientes',
          icono: ICONOS.aprobar as LucideIconData,
          rolesPermitidos: ['admin'] as const,
          ejecutar: () => this.irA('/pedidos?estado=Solicitado'),
          badge: pendientes > 0 ? pendientes : null,
        },
        {
          label: 'Ver reportes',
          icono: ICONOS.reportes as LucideIconData,
          rolesPermitidos: ['admin'] as const,
          ejecutar: () => this.irA('/reportes/pedidos'),
        },
      ];
    }
    return [
      {
        label: 'Registrar consumo',
        icono: ICONOS.crear as LucideIconData,
        rolesPermitidos: ['consultor', 'admin'] as const,
        ejecutar: () => this.abrirDrawer(),
      },
      {
        label: 'Ver mis consumos',
        icono: ICONOS.calendario as LucideIconData,
        rolesPermitidos: ['consultor', 'admin'] as const,
        ejecutar: () => this.irA('/consumos'),
      },
    ];
  });

  constructor() {
    this.cargar();
  }

  protected reintentar(): void {
    this.cargar();
  }

  protected colorActividad(tipo: TipoActividad): string {
    return COLOR_POR_TIPO[tipo];
  }

  protected tiempoRelativo(fecha: string): string {
    return formatearTiempoRelativo(fecha);
  }

  protected onClickActividad(evento: ActividadEvento): void {
    if (evento.recurso.tipo === 'pedido') {
      void this.router.navigate(['/pedidos', evento.recurso.id]);
    } else if (evento.recurso.tipo === 'proyecto') {
      void this.router.navigate(['/proyectos', evento.recurso.id]);
    } else {
      void this.router.navigate(['/consumos']);
    }
  }

  protected abrirDrawer(): void {
    if (this.pedidos().length === 0) {
      // cargar lazily al primer abrir
      forkJoin({
        pedidos: this.pedidosApi.list(),
        perfiles: this.perfilesApi.list(),
        recursos: this.recursosApi.list(),
        consumos: this.consumosApi.list({}),
      }).subscribe({
        next: ({ pedidos, perfiles, recursos, consumos }) => {
          this.pedidos.set(pedidos);
          this.perfiles.set(perfiles);
          this.recursos.set(recursos);
          this.consumosCache.set(consumos);
          this.drawerAbierto.set(true);
        },
        error: (err: HttpErrorResponse) => {
          this.toast.add({
            severity: 'error',
            summary: 'No se pudo abrir el formulario',
            detail: this.extraerCopyError(err),
          });
        },
      });
    } else {
      this.drawerAbierto.set(true);
    }
  }

  protected cerrarDrawer(): void {
    this.drawerAbierto.set(false);
  }

  protected onConsumoRegistrado(consumo: Consumo): void {
    this.consumosCache.update((lista) => [...lista, consumo]);
    this.toast.add({
      severity: 'success',
      summary: 'Consumo registrado',
    });
    // Recargar KPIs y feed para reflejar el nuevo consumo
    this.cargar();
  }

  private nombreUsuario(): string {
    const email = this.auth.usuario()?.email ?? '';
    if (!email) return '';
    const local = email.split('@')[0] ?? '';
    if (!local) return '';
    return local.charAt(0).toUpperCase() + local.slice(1);
  }

  private irA(ruta: string): void {
    void this.router.navigateByUrl(ruta);
  }

  private cargar(): void {
    const r = this.auth.rol();
    if (!r) {
      this.cargando.set(false);
      return;
    }
    this.cargando.set(true);
    this.errorCarga.set(null);

    const kpis$ =
      r === 'admin' ? this.api.kpisAdmin() : this.api.kpisConsultor();
    const actividad$ = this.api.actividad(10).pipe(
      catchError(() => of([] as ActividadEvento[])),
    );

    forkJoin({ kpis: kpis$, actividad: actividad$ }).subscribe({
      next: ({ kpis, actividad }) => {
        if (r === 'admin') {
          this.kpisAdmin.set(kpis as KpisAdmin);
          this.kpisConsultor.set(null);
        } else {
          this.kpisConsultor.set(kpis as KpisConsultor);
          this.kpisAdmin.set(null);
        }
        this.actividad.set(actividad);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorCarga.set(this.extraerCopyError(err));
      },
    });
  }

  private extraerCopyError(err: HttpErrorResponse): string {
    const body = err.error as
      | {
          code?: string;
          message?: string | string[];
          fields?: Record<string, unknown>;
        }
      | undefined;
    if (typeof body?.code === 'string' && typeof body.message === 'string') {
      return mapearErrorACopy({
        code: body.code,
        message: body.message,
        fields: body.fields,
      });
    }
    if (Array.isArray(body?.message)) {
      return body.message.join(', ');
    }
    if (typeof body?.message === 'string') {
      return body.message;
    }
    return err.message;
  }
}

function formatearImporte(v: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(v);
}

function formatearHoras(v: number): string {
  return `${new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 2,
  }).format(v)} h`;
}

function formatearFechaHoy(): string {
  const hoy = new Date();
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(hoy);
}

function formatearTiempoRelativo(iso: string): string {
  const now = Date.now();
  const fecha = new Date(iso).getTime();
  if (!Number.isFinite(fecha)) return '';
  const diffMs = now - fecha;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'hace un momento';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD === 1) return 'ayer';
  if (diffD < 7) return `hace ${diffD} días`;
  if (diffD < 30) return `hace ${Math.round(diffD / 7)} sem`;
  const diffMes = Math.round(diffD / 30);
  if (diffMes < 12) return `hace ${diffMes} meses`;
  return `hace ${Math.round(diffMes / 12)} años`;
}
