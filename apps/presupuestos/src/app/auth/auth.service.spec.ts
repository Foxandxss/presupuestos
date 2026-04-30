import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from './auth.service';

@Component({ selector: 'app-stub', standalone: true, template: '' })
class StubPage {}

const routesStub = [{ path: 'login', component: StubPage }];

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routesStub),
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('persiste el token y el usuario en localStorage tras un login válido', () => {
    let observed: { usuario: { rol: string } } | null = null;
    service.login('admin@x.com', 'admin123').subscribe((res) => {
      observed = res;
    });

    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({
      accessToken: 'jwt-token',
      usuario: { id: 1, email: 'admin@x.com', rol: 'admin' },
    });

    expect(observed).not.toBeNull();
    expect(service.autenticado()).toBe(true);
    expect(service.token()).toBe('jwt-token');
    expect(service.usuario()?.rol).toBe('admin');
    expect(localStorage.getItem('presupuestos.auth')).toContain('jwt-token');
  });

  it('logout limpia la sesión y localStorage', () => {
    localStorage.setItem(
      'presupuestos.auth',
      JSON.stringify({
        accessToken: 'tok',
        usuario: { id: 1, email: 'a@x', rol: 'admin' },
      }),
    );
    // Re-instanciar para que lea localStorage en el constructor.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routesStub),
      ],
    });
    const fresco = TestBed.inject(AuthService);

    expect(fresco.autenticado()).toBe(true);
    fresco.logout();
    expect(fresco.autenticado()).toBe(false);
    expect(localStorage.getItem('presupuestos.auth')).toBeNull();
  });
});
