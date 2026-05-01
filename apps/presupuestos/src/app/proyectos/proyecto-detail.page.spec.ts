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

import { ProyectoDetailPage } from './proyecto-detail.page';
import type { EstimacionPerfilConDerivados, Proyecto } from './proyectos.types';

const PROYECTO: Proyecto = {
  id: 5,
  nombre: 'Migración core 2026',
  descripcion: 'Reemplazo del legado',
  fechaInicio: '2026-04-01',
  fechaFin: '2026-12-31',
  estimaciones: [],
  createdAt: '2026-04-01',
  updatedAt: '2026-04-01',
};

const ESTIMACIONES: EstimacionPerfilConDerivados[] = [
  {
    id: 11,
    proyectoId: 5,
    perfilTecnicoId: 1,
    horasEstimadas: 200,
    horasOfertadas: 100,
    horasConsumidas: 40,
    createdAt: '2026-04-01',
    updatedAt: '2026-04-01',
  },
  {
    id: 12,
    proyectoId: 5,
    perfilTecnicoId: 2,
    horasEstimadas: 80,
    horasOfertadas: 80,
    horasConsumidas: 20,
    createdAt: '2026-04-01',
    updatedAt: '2026-04-01',
  },
];

const PERFILES = [
  {
    id: 1,
    nombre: 'Senior',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 2,
    nombre: 'Junior',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const PEDIDOS = [
  {
    id: 42,
    proyectoId: 5,
    proveedorId: 100,
    estado: 'Aprobado',
    fechaSolicitud: '2026-04-10',
    fechaAprobacion: '2026-04-12',
    lineas: [
      {
        id: 200,
        pedidoId: 42,
        perfilTecnicoId: 1,
        fechaInicio: '2026-04-01',
        fechaFin: '2026-06-30',
        horasOfertadas: 100,
        precioHora: 50,
        tarifaCongelada: true,
        createdAt: '2026-04-01',
        updatedAt: '2026-04-01',
      },
    ],
    createdAt: '2026-04-01',
    updatedAt: '2026-04-12',
  },
  {
    id: 43,
    proyectoId: 99, // Otro proyecto - debe filtrarse fuera
    proveedorId: 100,
    estado: 'Borrador',
    fechaSolicitud: null,
    fechaAprobacion: null,
    lineas: [],
    createdAt: '2026-04-01',
    updatedAt: '2026-04-01',
  },
];

class AuthServiceStub {
  rol = () => 'admin' as const;
  usuario = () => ({ email: 'admin@demo.com', rol: 'admin' as const });
  autenticado = () => true;
}

function flushTodasLasCargas(
  httpMock: HttpTestingController,
  proyecto: Proyecto = PROYECTO,
  estimaciones: EstimacionPerfilConDerivados[] = ESTIMACIONES,
): void {
  httpMock.expectOne('/api/proyectos/5').flush(proyecto);
  httpMock
    .expectOne('/api/proyectos/5/estimaciones?conDerivados=true')
    .flush(estimaciones);
  httpMock.expectOne('/api/perfiles-tecnicos').flush(PERFILES);
  httpMock.expectOne('/api/pedidos').flush(PEDIDOS);
}

describe('ProyectoDetailPage', () => {
  let fixture: ComponentFixture<ProyectoDetailPage>;
  let httpMock: HttpTestingController;

  function configurar(idParam: string): void {
    TestBed.configureTestingModule({
      imports: [ProyectoDetailPage],
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
    fixture = TestBed.createComponent(ProyectoDetailPage);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('renderiza el nombre del proyecto y subtitulo con estado calculado', () => {
    configurar('5');
    flushTodasLasCargas(httpMock);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.pre-detail__titulo')?.textContent).toContain(
      'Migración core 2026',
    );
    // fechaFin en el futuro lejano (2026-12-31) frente a "today" del test
    // → estado puede variar, sólo verificamos que aparece "·"
    expect(root.querySelector('.pre-detail__subtitulo')?.textContent).toContain(
      '·',
    );
  });

  it('calcula KPIs: estimadas=280, ofertadas=180, consumidas=60, pendientes=120', () => {
    configurar('5');
    flushTodasLasCargas(httpMock);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const valores = Array.from(
      root.querySelectorAll<HTMLElement>('.pre-kpi__valor'),
    ).map((e) => e.textContent?.replace(/\s+/g, ' ').trim());

    // estimadas: 200 + 80 = 280
    expect(valores[0]).toContain('280');
    // ofertadas: 100 + 80 = 180
    expect(valores[1]).toContain('180');
    // consumidas: 40 + 20 = 60
    expect(valores[2]).toContain('60');
    // pendientes: 180 - 60 = 120
    expect(valores[3]).toContain('120');
  });

  it('renderiza la tabla de estimaciones con columnas derivadas Ofertadas/Consumidas', () => {
    configurar('5');
    flushTodasLasCargas(httpMock);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Senior');
    expect(root.textContent).toContain('Junior');
    // El texto de progreso "40 / 100 h" debe aparecer
    const textoProgreso = root.querySelector(
      '.pre-detail__progreso-texto',
    )?.textContent;
    expect(textoProgreso).toMatch(/40[.,]?\s*\/\s*100/);
  });

  it('filtra los pedidos al proyecto en curso (excluye pedidos de otros proyectos)', () => {
    configurar('5');
    flushTodasLasCargas(httpMock);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    // Sólo aparece pedido #42 (proyectoId=5), no #43 (proyectoId=99)
    expect(root.textContent).toContain('#42');
    expect(root.textContent).not.toContain('#43');
  });

  it('cuando 404, muestra mensaje "Proyecto no encontrado"', () => {
    configurar('5');
    httpMock
      .expectOne('/api/proyectos/5')
      .flush(
        { message: 'No existe' },
        { status: 404, statusText: 'Not Found' },
      );
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Proyecto no encontrado');
  });

  it('cuando id de URL no es número válido, muestra "Proyecto no encontrado"', () => {
    configurar('abc');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Proyecto no encontrado');
  });

  it('proyecto sin estimaciones: muestra mensaje vacio', () => {
    configurar('5');
    httpMock
      .expectOne('/api/proyectos/5')
      .flush({ ...PROYECTO, estimaciones: [] });
    httpMock
      .expectOne('/api/proyectos/5/estimaciones?conDerivados=true')
      .flush([]);
    httpMock.expectOne('/api/perfiles-tecnicos').flush(PERFILES);
    httpMock.expectOne('/api/pedidos').flush([]);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Sin estimaciones todavía');
    expect(root.textContent).toContain(
      'Este proyecto todavía no tiene pedidos',
    );
  });
});
