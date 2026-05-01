import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ErrorStateComponent } from './error-state.component';

@Component({
  standalone: true,
  imports: [ErrorStateComponent],
  template: `
    <pre-error-state
      [titulo]="titulo()"
      [descripcion]="descripcion()"
      (reintentar)="onReintentar()"
    />
  `,
})
class HostComponent {
  titulo = signal('Falló');
  descripcion = signal<string | null>('Algo salió mal');
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
});
