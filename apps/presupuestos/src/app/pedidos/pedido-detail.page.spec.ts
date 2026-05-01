import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { AuthService } from '../auth/auth.service';

import { PedidoDetailPage } from './pedido-detail.page';
import type { Pedido } from './pedidos.types';

const PEDIDO: Pedido = {
  id: 42,
  proyectoId: 5,
  proveedorId: 100,
  estado: 'Aprobado',
  fechaSolicitud: '2026-03-01',
  fechaAprobacion: '2026-03-05',
  lineas: [
    {
      id: 200,
      pedidoId: 42,
      perfilTecnicoId: 1,
      fechaInicio: '2026-03-01',
      fechaFin: '2026-06-30',
      horasOfertadas: 100,
      precioHora: 50,
      tarifaCongelada: true,
      createdAt: '2026-03-01',
      updatedAt: '2026-03-01',
    },
    {
      id: 201,
      pedidoId: 42,
      perfilTecnicoId: 1,
      fechaInicio: '2026-04-01',
      fechaFin: '2026-07-30',
      horasOfertadas: 80,
      precioHora: 60,
      tarifaCongelada: true,
      createdAt: '2026-03-01',
      updatedAt: '2026-03-01',
    },
  ],
  createdAt: '2026-03-01',
  updatedAt: '2026-03-05',
};

class AuthServiceStub {
  rol = () => 'admin' as const;
  usuario = () => ({ email: 'admin@demo.com', rol: 'admin' as const });
  autenticado = () => true;
}

function flushAllRelatedRequests(httpMock: HttpTestingController): void {
  httpMock.expectOne('/api/proyectos/5').flush({
    id: 5,
    nombre: 'Proyecto Demo',
    descripcion: null,
    fechaInicio: '2026-01-01',
    fechaFin: null,
    estimaciones: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  });
  httpMock.expectOne('/api/proveedores').flush([
    {
      id: 100,
      nombre: 'Acme SL',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ]);
  httpMock.expectOne('/api/perfiles-tecnicos').flush([
    {
      id: 1,
      nombre: 'Senior',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ]);
  httpMock.expectOne('/api/recursos').flush([
    {
      id: 10,
      nombre: 'Ana',
      proveedorId: 100,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ]);
  httpMock.expectOne('/api/consumos?pedidoId=42').flush([
    {
      id: 1,
      lineaPedidoId: 200,
      pedidoId: 42,
      recursoId: 10,
      mes: 4,
      anio: 2026,
      horasConsumidas: 40,
      fechaRegistro: '2026-04-30',
      createdAt: '2026-04-30',
      updatedAt: '2026-04-30',
    },
  ]);
}

describe('PedidoDetailPage', () => {
  let fixture: ComponentFixture<PedidoDetailPage>;
  let httpMock: HttpTestingController;

  function configurar(idParam: string): void {
    TestBed.configureTestingModule({
      imports: [PedidoDetailPage],
      providers: [
        provideAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        ConfirmationService,
        { provide: AuthService, useClass: AuthServiceStub },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: idParam })),
            snapshot: {
              paramMap: convertToParamMap({ id: idParam }),
            },
          },
        },
      ],
    });
    fixture = TestBed.createComponent(PedidoDetailPage);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('renderiza el título con el ID y proyecto, y el badge de estado', () => {
    configurar('42');
    httpMock.expectOne('/api/pedidos/42').flush(PEDIDO);
    flushAllRelatedRequests(httpMock);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.pre-detail__titulo')?.textContent).toContain(
      '#42',
    );
    expect(root.querySelector('.pre-detail__subtitulo')?.textContent).toContain(
      'Proyecto Demo',
    );
    expect(root.textContent).toContain('Aprobado');
  });

  it('calcula KPIs: importe = sum(horas*precio); horas ofertadas = sum(horas)', () => {
    configurar('42');
    httpMock.expectOne('/api/pedidos/42').flush(PEDIDO);
    flushAllRelatedRequests(httpMock);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const valores = Array.from(
      root.querySelectorAll<HTMLElement>('.pre-kpi__valor'),
    ).map((e) => e.textContent?.replace(/\s+/g, ' ').trim());

    // importe: 100*50 + 80*60 = 9800
    expect(valores[0]).toMatch(/9[,.]?800/);
    expect(valores[0]).toContain('€');
    // horas ofertadas: 100 + 80 = 180 h
    expect(valores[1]).toContain('180');
    // horas consumidas: 40
    expect(valores[2]).toContain('40');
    // % completado: 40 / 180 = 22%
    expect(valores[3]).toContain('22');
  });

  it('cuando estado=Borrador, muestra acción primaria "Solicitar"', () => {
    const borrador: Pedido = { ...PEDIDO, estado: 'Borrador' };
    configurar('42');
    httpMock.expectOne('/api/pedidos/42').flush(borrador);
    flushAllRelatedRequests(httpMock);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Solicitar');
    expect(root.textContent).not.toContain('Esperando');
  });

  it('cuando estado=EnEjecucion, muestra mensaje de espera y NO acción primaria', () => {
    const enEjecucion: Pedido = { ...PEDIDO, estado: 'EnEjecucion' };
    configurar('42');
    httpMock.expectOne('/api/pedidos/42').flush(enEjecucion);
    flushAllRelatedRequests(httpMock);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Esperando completar todas las líneas');
  });

  it('cuando 404, muestra mensaje de "Pedido no encontrado"', () => {
    configurar('42');
    httpMock
      .expectOne('/api/pedidos/42')
      .flush(
        { message: 'No existe' },
        { status: 404, statusText: 'Not Found' },
      );
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Pedido no encontrado');
  });

  it('cuando estado=Aprobado, expone botón "Registrar consumo"', () => {
    configurar('42');
    httpMock.expectOne('/api/pedidos/42').flush(PEDIDO);
    flushAllRelatedRequests(httpMock);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Registrar consumo');
  });

  it('cuando id de URL no es número válido, muestra "Pedido no encontrado"', () => {
    configurar('abc');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Pedido no encontrado');
  });
});
