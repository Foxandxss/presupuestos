import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AuthService } from '../auth/auth.service';

import { HomePage } from './home.page';
import type {
  ActividadEvento,
  ActividadPagina,
  KpisAdmin,
  KpisConsultor,
} from './inicio.types';

const KPIS_ADMIN: KpisAdmin = {
  pendientesAprobacion: 3,
  enEjecucion: 5,
  facturacionMes: 12345.67,
  facturacionMesDelta: 12,
  horasMesConsumidas: 240,
};

const KPIS_CONSULTOR: KpisConsultor = {
  enEjecucion: 5,
  consumosDelMes: 7,
  lineasQueCierranEsteMes: 2,
  misHorasConsumidasMes: 32,
};

const ACTIVIDAD_ITEMS: ActividadEvento[] = [
  {
    tipo: 'pedido_aprobado',
    fecha: '2026-04-30T12:00:00Z',
    descripcion: 'Pedido #142 aprobado.',
    recurso: { tipo: 'pedido', id: 142 },
  },
  {
    tipo: 'consumo_registrado',
    fecha: '2026-04-29T10:00:00Z',
    descripcion: 'Consumo de 40,00 h registrado en pedido #142 (Ada).',
    recurso: { tipo: 'consumo', id: 100 },
  },
];

const ACTIVIDAD: ActividadPagina = {
  total: ACTIVIDAD_ITEMS.length,
  items: ACTIVIDAD_ITEMS,
};

const ACTIVIDAD_VACIA: ActividadPagina = { total: 0, items: [] };

class AuthServiceStubAdmin {
  rol = () => 'admin' as const;
  usuario = () => ({ id: 1, email: 'admin@demo.com', rol: 'admin' as const });
  autenticado = () => true;
}

class AuthServiceStubConsultor {
  rol = () => 'consultor' as const;
  usuario = () => ({
    id: 7,
    email: 'consultor@demo.com',
    rol: 'consultor' as const,
  });
  autenticado = () => true;
}

describe('HomePage', () => {
  let fixture: ComponentFixture<HomePage>;
  let httpMock: HttpTestingController;

  function configurar(authStub: unknown): void {
    TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        { provide: AuthService, useValue: authStub },
      ],
    });
    fixture = TestBed.createComponent(HomePage);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('para admin: pide /api/inicio/kpis?rol=admin y /api/actividad', () => {
    configurar(new AuthServiceStubAdmin());
    httpMock
      .expectOne('/api/inicio/kpis?rol=admin')
      .flush(KPIS_ADMIN);
    httpMock.expectOne('/api/actividad?limit=10').flush(ACTIVIDAD);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Pendientes de aprobación');
    expect(root.textContent).toContain('Facturación del mes');
    // 3 pendientes
    const valores = Array.from(
      root.querySelectorAll<HTMLElement>('.pre-kpi__valor'),
    ).map((e) => e.textContent?.trim());
    expect(valores[0]).toBe('3');
    expect(valores[1]).toBe('5');
    // 12.345,67 € (formato es-ES)
    expect(valores[2]).toMatch(/12\.345/);
  });

  it('para consultor: pide /api/inicio/kpis?rol=consultor', () => {
    configurar(new AuthServiceStubConsultor());
    httpMock
      .expectOne('/api/inicio/kpis?rol=consultor')
      .flush(KPIS_CONSULTOR);
    httpMock.expectOne('/api/actividad?limit=10').flush(ACTIVIDAD);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Mis horas consumidas');
    expect(root.textContent).not.toContain('Facturación del mes');
  });

  it('admin: muestra acciones rápidas Crear pedido + Aprobar pendientes con badge', () => {
    configurar(new AuthServiceStubAdmin());
    httpMock.expectOne('/api/inicio/kpis?rol=admin').flush(KPIS_ADMIN);
    httpMock.expectOne('/api/actividad?limit=10').flush(ACTIVIDAD);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Crear pedido');
    expect(root.textContent).toContain('Aprobar pendientes');
    expect(root.textContent).toContain('Ver reportes');
    const badge = root.querySelector('.pre-acciones__badge');
    expect(badge?.textContent?.trim()).toBe('3');
  });

  it('consultor: muestra acción Registrar consumo (no Crear pedido)', () => {
    configurar(new AuthServiceStubConsultor());
    httpMock
      .expectOne('/api/inicio/kpis?rol=consultor')
      .flush(KPIS_CONSULTOR);
    httpMock.expectOne('/api/actividad?limit=10').flush(ACTIVIDAD);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Registrar consumo');
    expect(root.textContent).toContain('Ver mis consumos');
    expect(root.textContent).not.toContain('Crear pedido');
    expect(root.textContent).not.toContain('Ver reportes');
  });

  it('renderiza la actividad reciente con descripcion', () => {
    configurar(new AuthServiceStubAdmin());
    httpMock.expectOne('/api/inicio/kpis?rol=admin').flush(KPIS_ADMIN);
    httpMock.expectOne('/api/actividad?limit=10').flush(ACTIVIDAD);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Pedido #142 aprobado.');
    expect(root.textContent).toContain('Consumo de 40,00 h');
  });

  it('cuando actividad falla silenciosamente, sigue mostrando los KPIs', () => {
    configurar(new AuthServiceStubAdmin());
    httpMock.expectOne('/api/inicio/kpis?rol=admin').flush(KPIS_ADMIN);
    httpMock
      .expectOne('/api/actividad?limit=10')
      .flush({ message: 'Error' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Pendientes de aprobación');
    expect(root.textContent).toContain('Sin actividad reciente');
  });

  it('actividad vacía muestra el mensaje "Sin actividad reciente"', () => {
    configurar(new AuthServiceStubAdmin());
    httpMock.expectOne('/api/inicio/kpis?rol=admin').flush(KPIS_ADMIN);
    httpMock.expectOne('/api/actividad?limit=10').flush(ACTIVIDAD_VACIA);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Sin actividad reciente');
  });

  it('cuando los KPIs fallan, muestra error con botón de reintentar', () => {
    configurar(new AuthServiceStubAdmin());
    httpMock
      .expectOne('/api/inicio/kpis?rol=admin')
      .flush({ message: 'KO' }, { status: 500, statusText: 'Error' });
    // actividad se cancela en cuanto el forkJoin falla; cualquier match
    // pendiente aún debe consumirse para no romper el verify().
    httpMock
      .match('/api/actividad?limit=10')
      .forEach((req) => {
        if (!req.cancelled) req.flush(ACTIVIDAD_VACIA);
      });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('No se pudo cargar el inicio');
  });
});
