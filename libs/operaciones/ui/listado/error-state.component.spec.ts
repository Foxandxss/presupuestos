import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { NombreIcono } from '../iconos';

import { ErrorStateComponent } from './error-state.component';

@Component({
  standalone: true,
  imports: [ErrorStateComponent],
  template: `
    <pre-error-state
      [titulo]="titulo()"
      [descripcion]="descripcion()"
      [iconoNombre]="iconoNombre()"
      [etiquetaAccion]="etiquetaAccion()"
      [mostrarAccion]="mostrarAccion()"
      (reintentar)="onReintentar()"
    />
  `,
})
class HostComponent {
  titulo = signal('Falló');
  descripcion = signal<string | null>('Algo salió mal');
  iconoNombre = signal<NombreIcono>('errorCarga');
  etiquetaAccion = signal('Reintentar');
  mostrarAccion = signal(true);
  reintentarCount = 0;
  onReintentar(): void {
    this.reintentarCount += 1;
  }
}

describe('ErrorStateComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renderiza título y descripción con role="alert"', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Falló');
    expect(root.textContent).toContain('Algo salió mal');
    expect(root.querySelector('.pre-error-state')?.getAttribute('role')).toBe(
      'alert',
    );
  });

  it('emite reintentar al hacer click en el botón', () => {
    const btn = (fixture.nativeElement as HTMLElement).querySelector(
      '.pre-error-state__retry',
    ) as HTMLButtonElement;
    btn.click();
    expect(host.reintentarCount).toBe(1);
  });

  it('muestra etiqueta personalizada en el botón', () => {
    host.etiquetaAccion.set('Volver al inicio');
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector(
      '.pre-error-state__retry',
    ) as HTMLButtonElement;
    expect(btn.textContent?.trim()).toBe('Volver al inicio');
  });

  it('oculta el botón cuando mostrarAccion=false', () => {
    host.mostrarAccion.set(false);
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector(
      '.pre-error-state__retry',
    );
    expect(btn).toBeNull();
  });

  it('selecciona icono según iconoNombre', () => {
    host.iconoNombre.set('recursoNoEncontrado');
    fixture.detectChanges();
    const icono = (fixture.nativeElement as HTMLElement).querySelector(
      '.pre-error-state__icon',
    );
    expect(icono).toBeTruthy();
  });
});
