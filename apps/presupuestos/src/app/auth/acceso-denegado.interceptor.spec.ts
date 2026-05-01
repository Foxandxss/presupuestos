import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { accesoDenegadoInterceptor } from './acceso-denegado.interceptor';

class RouterStub {
  url = '/pedidos';
  ultimaRuta: string | null = null;
  navigateByUrl(ruta: string): Promise<boolean> {
    this.ultimaRuta = ruta;
    return Promise.resolve(true);
  }
}

class MessageServiceStub {
  mensajes: { severity?: string; summary?: string }[] = [];
  add(msg: { severity?: string; summary?: string }): void {
    this.mensajes.push(msg);
  }
}

describe('accesoDenegadoInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let router: RouterStub;
  let toast: MessageServiceStub;

  beforeEach(() => {
    router = new RouterStub();
    toast = new MessageServiceStub();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([accesoDenegadoInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        { provide: MessageService, useValue: toast },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('redirige a /inicio y muestra toast cuando llega un 403', () => {
    let errorRecibido: unknown = null;
    http.get('/api/secret').subscribe({
      next: () => fail('debería fallar'),
      error: (err: unknown) => {
        errorRecibido = err;
      },
    });

    httpTesting.expectOne('/api/secret').flush(null, {
      status: 403,
      statusText: 'Forbidden',
    });

    expect(router.ultimaRuta).toBe('/inicio');
    expect(toast.mensajes.length).toBe(1);
    expect(toast.mensajes[0].summary).toBe('No hay nada aquí.');
    expect(errorRecibido).not.toBeNull();
  });

  it('no redirige cuando ya está en /inicio (evita loop)', () => {
    router.url = '/inicio';
    http.get('/api/secret').subscribe({
      next: () => fail('debería fallar'),
      error: () => {
        // expected
      },
    });

    httpTesting.expectOne('/api/secret').flush(null, {
      status: 403,
      statusText: 'Forbidden',
    });

    expect(router.ultimaRuta).toBeNull();
    expect(toast.mensajes.length).toBe(1);
  });

  it('no toca router/toast en errores que no son 403', () => {
    http.get('/api/algo').subscribe({
      next: () => fail('debería fallar'),
      error: () => {
        // expected
      },
    });

    httpTesting.expectOne('/api/algo').flush(null, {
      status: 500,
      statusText: 'Server Error',
    });

    expect(router.ultimaRuta).toBeNull();
    expect(toast.mensajes.length).toBe(0);
  });

  it('no toca router/toast en respuesta exitosa', () => {
    let resultado: unknown = null;
    http.get('/api/ok').subscribe((r) => {
      resultado = r;
    });

    httpTesting.expectOne('/api/ok').flush({ ok: true });

    expect(resultado).toEqual({ ok: true });
    expect(router.ultimaRuta).toBeNull();
    expect(toast.mensajes.length).toBe(0);
  });
});
