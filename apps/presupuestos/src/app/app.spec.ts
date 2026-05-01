import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { AuthService } from './auth/auth.service';

@Component({ selector: 'app-stub', standalone: true, template: '' })
class StubPage {}

const routesStub = [{ path: 'login', component: StubPage }];

describe('App (shell)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function setupAuth(rol: 'admin' | 'consultor' | null) {
    if (rol) {
      localStorage.setItem(
        'presupuestos.auth',
        JSON.stringify({
          accessToken: 'fake-token',
          usuario: { id: 1, email: `${rol}@x.com`, rol },
        }),
      );
    }
  }

  async function render() {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routesStub),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    return fixture;
  }

  it('no muestra el shell cuando no hay sesión', async () => {
    const fixture = await render();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('pre-page-shell')).toBeNull();
  });

  it('muestra el shell con grupo Reportes para admin', async () => {
    setupAuth('admin');
    const fixture = await render();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('pre-page-shell')).not.toBeNull();
    expect(compiled.textContent).toContain('Catálogo');
    expect(compiled.textContent).toContain('Operativa');
    expect(compiled.textContent).toContain('Proyectos');
    expect(compiled.textContent).toContain('Pedidos');
    expect(compiled.textContent).toContain('Consumos');
    expect(compiled.textContent).toContain('Reportes');
  });

  it('consultor ve la operativa pero NO Reportes', async () => {
    setupAuth('consultor');
    const fixture = await render();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Catálogo');
    expect(compiled.textContent).toContain('Operativa');
    expect(compiled.textContent).toContain('Pedidos');
    expect(compiled.textContent).toContain('Consumos');
    expect(compiled.textContent).not.toContain('Reportes');
  });

  it('logout limpia la sesión almacenada', async () => {
    setupAuth('admin');
    await render();
    const auth = TestBed.inject(AuthService);
    auth.logout();
    expect(localStorage.getItem('presupuestos.auth')).toBeNull();
    expect(auth.autenticado()).toBe(false);
  });
});
