import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';

import type {
  PerfilTecnico,
  Recurso,
} from '../catalogo/catalogo.types';
import type { Pedido } from '../pedidos/pedidos.types';

import { ConsumoDrawerComponent } from './consumo-drawer.component';
import type { Consumo } from './consumos.types';

const PERFILES: PerfilTecnico[] = [
  {
    id: 1,
    nombre: 'Senior',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const RECURSOS: Recurso[] = [
  {
    id: 10,
    nombre: 'Ana',
    proveedorId: 100,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 11,
    nombre: 'Luis',
    proveedorId: 100,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 12,
    nombre: 'Marta',
    proveedorId: 999,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const PEDIDO_APROBADO: Pedido = {
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
  ],
  createdAt: '2026-03-01',
  updatedAt: '2026-03-05',
};

const PEDIDO_BORRADOR: Pedido = {
  id: 43,
  proyectoId: 5,
  proveedorId: 100,
  estado: 'Borrador',
  fechaSolicitud: null,
  fechaAprobacion: null,
  lineas: [],
  createdAt: '2026-03-01',
  updatedAt: '2026-03-01',
};

@Component({
  standalone: true,
  imports: [ConsumoDrawerComponent],
  template: `
    <pre-consumo-drawer
      [abierto]="abierto()"
      [pedidos]="pedidos"
      [recursos]="recursos"
      [perfiles]="perfiles"
      [consumosExistentes]="consumosExistentes"
      [pedidoIdInicial]="pedidoIdInicial()"
      [bloquearPedido]="bloquearPedido()"
      (cerrar)="onCerrar()"
      (registrado)="onRegistrado($event)"
    />
  `,
})
class HostComponent {
  abierto = signal(false);
  pedidoIdInicial = signal<number | null>(null);
  bloquearPedido = signal(false);
  pedidos: readonly Pedido[] = [PEDIDO_APROBADO, PEDIDO_BORRADOR];
  recursos: readonly Recurso[] = RECURSOS;
  perfiles: readonly PerfilTecnico[] = PERFILES;
  consumosExistentes: readonly Consumo[] = [];
  cerrarCount = 0;
  registrados: Consumo[] = [];
  onCerrar(): void {
    this.cerrarCount += 1;
  }
  onRegistrado(c: Consumo): void {
    this.registrados.push(c);
  }
}

describe('ConsumoDrawerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function abrir(pedidoId: number | null = null): void {
    host.pedidoIdInicial.set(pedidoId);
    if (pedidoId !== null) {
      host.bloquearPedido.set(true);
    }
    host.abierto.set(true);
    fixture.detectChanges();
  }

  it('no renderiza nada mientras está cerrado', () => {
    expect(root().querySelector('.pre-drawer__panel')).toBeNull();
  });

  it('renderiza el panel cuando abierto=true', () => {
    abrir();
    expect(root().querySelector('.pre-drawer__panel')).not.toBeNull();
  });

  it('emite cerrar al hacer click en el backdrop', () => {
    abrir();
    const backdrop = root().querySelector(
      '.pre-drawer__backdrop',
    ) as HTMLElement;
    backdrop.click();
    expect(host.cerrarCount).toBe(1);
  });

  it('emite cerrar al pulsar Escape', () => {
    abrir();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(host.cerrarCount).toBe(1);
  });

  it('NO cierra al hacer click dentro del panel', () => {
    abrir();
    const panel = root().querySelector('.pre-drawer__panel') as HTMLElement;
    panel.click();
    expect(host.cerrarCount).toBe(0);
  });

  it('cuando bloquearPedido=true, oculta el selector de pedido', () => {
    abrir(42);
    const labels = Array.from(
      root().querySelectorAll<HTMLLabelElement>('label'),
    ).map((l) => l.textContent?.trim());
    expect(labels).not.toContain('Pedido');
  });

  it('horasDisponibles refleja oferta - consumidas para (línea, recurso)', async () => {
    host.consumosExistentes = [
      {
        id: 1,
        lineaPedidoId: 200,
        pedidoId: 42,
        recursoId: 10,
        mes: 3,
        anio: 2026,
        horasConsumidas: 30,
        fechaRegistro: '2026-03-30',
        createdAt: '2026-03-30',
        updatedAt: '2026-03-30',
      },
      {
        id: 2,
        lineaPedidoId: 200,
        pedidoId: 42,
        recursoId: 10,
        mes: 4,
        anio: 2026,
        horasConsumidas: 20,
        fechaRegistro: '2026-04-30',
        createdAt: '2026-04-30',
        updatedAt: '2026-04-30',
      },
    ];
    abrir(42);

    const drawer = fixture.debugElement.children[0]
      .componentInstance as ConsumoDrawerComponent;
    drawer['form'].patchValue({ lineaPedidoId: 200, recursoId: 10 });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const hint = root().querySelector('.pre-drawer__hint');
    expect(hint?.textContent).toContain('50');
  });

  it('marca alerta cuando horas ingresadas exceden disponibles', async () => {
    host.consumosExistentes = [
      {
        id: 1,
        lineaPedidoId: 200,
        pedidoId: 42,
        recursoId: 10,
        mes: 3,
        anio: 2026,
        horasConsumidas: 80,
        fechaRegistro: '2026-03-30',
        createdAt: '2026-03-30',
        updatedAt: '2026-03-30',
      },
    ];
    abrir(42);

    const drawer = fixture.debugElement.children[0]
      .componentInstance as ConsumoDrawerComponent;
    drawer['form'].patchValue({
      lineaPedidoId: 200,
      recursoId: 10,
      horasConsumidas: 50,
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const hint = root().querySelector('.pre-drawer__hint--alerta');
    expect(hint).not.toBeNull();
    expect(hint?.textContent).toContain('Sobrepasa');
  });

  it('al registrar OK, llama POST /api/consumos y emite registrado', async () => {
    abrir(42);
    const drawer = fixture.debugElement.children[0]
      .componentInstance as ConsumoDrawerComponent;
    drawer['form'].patchValue({
      lineaPedidoId: 200,
      recursoId: 10,
      mes: 5,
      anio: 2026,
      horasConsumidas: 25,
    });
    fixture.detectChanges();

    drawer['onSubmit']();

    const req = httpMock.expectOne('/api/consumos');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      lineaPedidoId: 200,
      recursoId: 10,
      mes: 5,
      anio: 2026,
      horasConsumidas: 25,
    });

    const consumoOk: Consumo = {
      id: 99,
      lineaPedidoId: 200,
      pedidoId: 42,
      recursoId: 10,
      mes: 5,
      anio: 2026,
      horasConsumidas: 25,
      fechaRegistro: '2026-05-15',
      createdAt: '2026-05-15',
      updatedAt: '2026-05-15',
    };
    req.flush(consumoOk);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.registrados).toEqual([consumoOk]);
  });

  it('tras registrar OK, mantiene línea/recurso y resetea mes/horas', async () => {
    abrir(42);
    const drawer = fixture.debugElement.children[0]
      .componentInstance as ConsumoDrawerComponent;
    drawer['form'].patchValue({
      lineaPedidoId: 200,
      recursoId: 10,
      mes: 5,
      anio: 2026,
      horasConsumidas: 25,
    });
    drawer['onSubmit']();

    httpMock.expectOne('/api/consumos').flush({
      id: 99,
      lineaPedidoId: 200,
      pedidoId: 42,
      recursoId: 10,
      mes: 5,
      anio: 2026,
      horasConsumidas: 25,
      fechaRegistro: '2026-05-15',
      createdAt: '2026-05-15',
      updatedAt: '2026-05-15',
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const valores = drawer['form'].value;
    expect(valores.pedidoId).toBe(42);
    expect(valores.lineaPedidoId).toBe(200);
    expect(valores.recursoId).toBe(10);
    expect(valores.mes).toBeNull();
    expect(valores.horasConsumidas).toBeNull();
  });

  it('en error 400 con código de dominio muestra copy específico', async () => {
    abrir(42);
    const drawer = fixture.debugElement.children[0]
      .componentInstance as ConsumoDrawerComponent;
    drawer['form'].patchValue({
      lineaPedidoId: 200,
      recursoId: 10,
      mes: 5,
      anio: 2026,
      horasConsumidas: 999,
    });
    drawer['onSubmit']();

    httpMock.expectOne('/api/consumos').flush(
      {
        code: 'excede_horas_ofertadas',
        message: 'fallback',
        fields: { disponibles: 27 },
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    const errorBox = root().querySelector('.pre-drawer__error');
    expect(errorBox?.textContent).toContain('27 h disponibles');
  });

  it('filtra recursos por proveedor del pedido seleccionado', async () => {
    abrir(42);
    const drawer = fixture.debugElement.children[0]
      .componentInstance as ConsumoDrawerComponent;
    expect(drawer['recursosDisponibles']().map((r) => r.id)).toEqual([10, 11]);
  });
});
