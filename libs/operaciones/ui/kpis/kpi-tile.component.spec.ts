import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Activity, type LucideIconData } from 'lucide-angular';

import { KpiTileComponent, type PreKpiDelta } from './kpi-tile.component';

@Component({
  standalone: true,
  imports: [KpiTileComponent],
  template: `
    <pre-kpi-tile
      [etiqueta]="etiqueta()"
      [valor]="valor()"
      [icono]="icono()"
      [delta]="delta()"
      [href]="href()"
    />
  `,
})
class HostComponent {
  etiqueta = signal('Pendientes');
  valor = signal('12');
  icono = signal<LucideIconData | null>(Activity as LucideIconData);
  delta = signal<PreKpiDelta | null>(null);
  href = signal<string | unknown[] | null>(null);
}

describe('KpiTileComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renderiza etiqueta y valor sin link cuando href=null', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('a')).toBeNull();
    expect(root.querySelector('.pre-kpi--no-link')).not.toBeNull();
    expect(root.textContent).toContain('Pendientes');
    expect(root.textContent).toContain('12');
  });

  it('renderiza como anchor cuando se pasa href', () => {
    host.href.set('/pedidos');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const a = root.querySelector('a');
    expect(a).not.toBeNull();
    expect(a?.getAttribute('aria-label')).toBe('Pendientes');
  });

  it('muestra delta positivo con signo +', () => {
    host.delta.set({ porcentaje: 8, positivo: true, textoSecundario: 'vs mes anterior' });
    fixture.detectChanges();
    const delta = (fixture.nativeElement as HTMLElement).querySelector(
      '.pre-kpi__delta',
    );
    expect(delta?.classList).toContain('pre-kpi__delta--positivo');
    expect(delta?.textContent).toContain('+8%');
    expect(delta?.textContent).toContain('vs mes anterior');
  });

  it('muestra delta negativo con signo menos', () => {
    host.delta.set({ porcentaje: 5, positivo: false });
    fixture.detectChanges();
    const delta = (fixture.nativeElement as HTMLElement).querySelector(
      '.pre-kpi__delta',
    );
    expect(delta?.classList).toContain('pre-kpi__delta--negativo');
    expect(delta?.textContent).toContain('−5%');
  });

  it('omite delta cuando delta=null', () => {
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.pre-kpi__delta'),
    ).toBeNull();
  });
});
