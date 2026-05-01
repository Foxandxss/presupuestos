import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Rol } from '@operaciones/dominio';

import { AuthService } from './auth.service';
import { PreIfRolDirective } from './pre-if-rol.directive';

class AuthServiceStub {
  rolSignal = signal<Rol | null>('admin');
  rol = this.rolSignal;
}

@Component({
  standalone: true,
  imports: [PreIfRolDirective],
  template: `
    <div *preIfRol="Rol.Admin" data-testid="solo-admin">solo-admin</div>
    <div *preIfRol="[Rol.Admin, Rol.Consultor]" data-testid="ambos">
      ambos
    </div>
    <div *preIfRol="Rol.Admin; not: true" data-testid="no-admin">no-admin</div>
  `,
})
class HostComponent {
  protected readonly Rol = Rol;
}

describe('PreIfRolDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let auth: AuthServiceStub;

  beforeEach(async () => {
    auth = new AuthServiceStub();
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: AuthService, useValue: auth }],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('admin ve los items admin-only y los multi-rol', () => {
    expect(root().querySelector('[data-testid="solo-admin"]')).not.toBeNull();
    expect(root().querySelector('[data-testid="ambos"]')).not.toBeNull();
    expect(root().querySelector('[data-testid="no-admin"]')).toBeNull();
  });

  it('consultor no ve los items admin-only pero sí los multi-rol', () => {
    auth.rolSignal.set('consultor');
    fixture.detectChanges();
    expect(root().querySelector('[data-testid="solo-admin"]')).toBeNull();
    expect(root().querySelector('[data-testid="ambos"]')).not.toBeNull();
    expect(root().querySelector('[data-testid="no-admin"]')).not.toBeNull();
  });

  it('sin rol oculta admin-only y multi-rol pero muestra negado', () => {
    auth.rolSignal.set(null);
    fixture.detectChanges();
    expect(root().querySelector('[data-testid="solo-admin"]')).toBeNull();
    expect(root().querySelector('[data-testid="ambos"]')).toBeNull();
    expect(root().querySelector('[data-testid="no-admin"]')).not.toBeNull();
  });

  it('reactivo: cambiar el rol re-renderiza dinámicamente', () => {
    expect(root().querySelector('[data-testid="solo-admin"]')).not.toBeNull();
    auth.rolSignal.set('consultor');
    fixture.detectChanges();
    expect(root().querySelector('[data-testid="solo-admin"]')).toBeNull();
    auth.rolSignal.set('admin');
    fixture.detectChanges();
    expect(root().querySelector('[data-testid="solo-admin"]')).not.toBeNull();
  });
});
