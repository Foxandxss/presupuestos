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

  it('no muestra el menubar cuando no hay sesión', async () => {
    const fixture = await render();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p-menubar')).toBeNull();
  });

  it('muestra menú con item "Catálogo" cuando el usuario es admin', async () => {
    setupAuth('admin');
    const fixture = await render();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p-menubar')).not.toBeNull();
    expect(compiled.textContent).toContain('Catálogo');
    expect(compiled.textContent).not.toContain('Mis consumos');
  });

  it('muestra menú con item "Mis consumos" cuando el usuario es consultor', async () => {
    setupAuth('consultor');
    const fixture = await render();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Mis consumos');
    expect(compiled.textContent).not.toContain('Catálogo');
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
