import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ChartData, ChartOptions } from 'chart.js';

import { defaultsParaChart } from './pre-chart-defaults';
import { PreChartComponent, type PreChartTipo } from './pre-chart.component';

@Component({
  standalone: true,
  imports: [PreChartComponent],
  template: `
    <pre-chart
      [tipo]="tipo()"
      [data]="data()"
      [opciones]="opciones()"
      [mensajeVacio]="mensajeVacio()"
    />
  `,
})
class HostComponent {
  tipo = signal<PreChartTipo>('doughnut');
  data = signal<ChartData>({
    labels: ['A', 'B'],
    datasets: [{ data: [1, 2], backgroundColor: ['#000', '#fff'] }],
  });
  opciones = signal<ChartOptions>(defaultsParaChart({ ejes: 'ninguno' }));
  mensajeVacio = signal<string>('Sin datos para mostrar.');
}

describe('PreChartComponent', () => {
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

  it('renderiza p-chart cuando hay datos', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('p-chart')).not.toBeNull();
    expect(root.querySelector('.pre-chart__vacio')).toBeNull();
  });

  it('muestra mensaje vacío cuando todos los valores son 0/null', () => {
    host.data.set({
      labels: ['A', 'B'],
      datasets: [{ data: [0, 0] }],
    });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('p-chart')).toBeNull();
    const vacio = root.querySelector('.pre-chart__vacio');
    expect(vacio?.textContent?.trim()).toBe('Sin datos para mostrar.');
  });

  it('muestra mensaje vacío cuando no hay datasets', () => {
    host.data.set({ labels: [], datasets: [] });
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.pre-chart__vacio'),
    ).not.toBeNull();
  });

  it('respeta el mensaje vacío personalizado', () => {
    host.data.set({ labels: [], datasets: [] });
    host.mensajeVacio.set('Sin facturación en el periodo.');
    fixture.detectChanges();
    const vacio = (fixture.nativeElement as HTMLElement).querySelector(
      '.pre-chart__vacio',
    );
    expect(vacio?.textContent?.trim()).toBe('Sin facturación en el periodo.');
  });
});
