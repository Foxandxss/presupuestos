import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PageShellComponent, type UsuarioShell } from './page-shell.component';

@Component({
  standalone: true,
  imports: [PageShellComponent],
  template: `
    <pre-page-shell [usuario]="usuario()" (logout)="onLogout()">
      <span data-testid="contenido">contenido</span>
    </pre-page-shell>
  `,
})
class HostComponent {
  usuario = signal<UsuarioShell>({ email: 'admin@demo.com', rol: 'admin' });
  logoutCount = 0;
  onLogout(): void {
    this.logoutCount += 1;
  }
}

describe('PageShellComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renderiza el contenido proyectado vía ng-content', () => {
    const el = fixture.nativeElement.querySelector(
      '[data-testid="contenido"]',
    ) as HTMLElement;
    expect(el.textContent?.trim()).toBe('contenido');
  });

  it('muestra los grupos Catálogo y Operativa para admin y consultor', () => {
    host.usuario.set({ email: 'consultor@demo.com', rol: 'consultor' });
    fixture.detectChanges();
    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('.pre-shell__group-label'),
    ).map((el) => (el as HTMLElement).textContent?.trim());
    expect(labels).toContain('Catálogo');
    expect(labels).toContain('Operativa');
  });

  it('oculta el grupo Reportes para consultor', () => {
    host.usuario.set({ email: 'consultor@demo.com', rol: 'consultor' });
    fixture.detectChanges();
    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('.pre-shell__group-label'),
    ).map((el) => (el as HTMLElement).textContent?.trim());
    expect(labels).not.toContain('Reportes');
  });

  it('muestra Reportes para admin', () => {
    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('.pre-shell__group-label'),
    ).map((el) => (el as HTMLElement).textContent?.trim());
    expect(labels).toContain('Reportes');
  });

  it('muestra el chip "Admin" para rol admin', () => {
    const chip = fixture.nativeElement.querySelector(
      '.pre-shell__chip',
    ) as HTMLElement;
    expect(chip.textContent?.trim()).toBe('Admin');
  });

  it('muestra el chip "Consultor" para rol consultor', () => {
    host.usuario.set({ email: 'consultor@demo.com', rol: 'consultor' });
    fixture.detectChanges();
    const chip = fixture.nativeElement.querySelector(
      '.pre-shell__chip',
    ) as HTMLElement;
    expect(chip.textContent?.trim()).toBe('Consultor');
  });

  it('toggle del sidebar persiste en localStorage', () => {
    const toggle = fixture.nativeElement.querySelector(
      '.pre-shell__toggle',
    ) as HTMLButtonElement;
    expect(
      fixture.nativeElement.querySelector('.pre-shell.is-colapsado'),
    ).toBeNull();
    toggle.click();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.pre-shell.is-colapsado'),
    ).not.toBeNull();
    expect(localStorage.getItem('presupuestos.sidebar-colapsado')).toBe('1');
  });

  it('emite evento logout al hacer click en Cerrar sesión del menú', () => {
    const menuToggle = fixture.nativeElement.querySelector(
      '.pre-shell__avatar-menu',
    ) as HTMLButtonElement;
    menuToggle.click();
    fixture.detectChanges();

    const items = Array.from(
      fixture.nativeElement.querySelectorAll(
        '.pre-shell__menu-item',
      ) as NodeListOf<HTMLButtonElement>,
    );
    const logout = items.find((b) =>
      b.textContent?.includes('Cerrar sesión'),
    ) as HTMLButtonElement;
    expect(logout).toBeDefined();
    logout.click();
    fixture.detectChanges();

    expect(host.logoutCount).toBe(1);
  });

  it('renderiza las iniciales del email cuando no hay nombre', () => {
    const avatar = fixture.nativeElement.querySelector(
      '.pre-shell__avatar',
    ) as HTMLElement;
    expect(avatar.textContent?.trim()).toBe('A');
  });
});
