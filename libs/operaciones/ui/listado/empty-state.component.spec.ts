import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  EmptyStateComponent,
  type VarianteEstadoVacio,
} from './empty-state.component';

@Component({
  standalone: true,
  imports: [EmptyStateComponent],
  template: `
    <pre-empty-state
      [variante]="variante()"
      [titulo]="titulo()"
      [descripcion]="descripcion()"
    >
      <button data-testid="cta">CTA</button>
    </pre-empty-state>
  `,
})
class HostComponent {
  variante = signal<VarianteEstadoVacio>('primer-uso');
  titulo = signal('Aún no hay nada');
  descripcion = signal<string | null>('Crea el primero');
}

describe('EmptyStateComponent', () => {
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

  it('renderiza título, descripción y CTA proyectado', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Aún no hay nada');
    expect(root.textContent).toContain('Crea el primero');
    expect(root.querySelector('[data-testid="cta"]')).not.toBeNull();
  });

  it('expone role="status" para accesibilidad', () => {
    const el = (fixture.nativeElement as HTMLElement).querySelector(
      '.pre-empty-state',
    );
    expect(el?.getAttribute('role')).toBe('status');
  });

  it('cambia de variante sin romperse', () => {
    host.variante.set('sin-resultados');
    host.titulo.set('Ningún resultado');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Ningún resultado',
    );
  });
});
