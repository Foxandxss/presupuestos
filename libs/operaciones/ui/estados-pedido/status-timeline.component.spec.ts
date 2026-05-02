import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusTimelineComponent } from './status-timeline.component';

@Component({
  standalone: true,
  imports: [StatusTimelineComponent],
  template: `
    <pre-status-timeline
      [estado]="estado"
      [fechaSolicitud]="fechaSolicitud"
      [fechaAprobacion]="fechaAprobacion"
      [fechaEnEjecucion]="fechaEnEjecucion"
      [fechaConsumido]="fechaConsumido"
      [fechaTerminacion]="fechaTerminacion"
      [estadoPrevioTerminal]="estadoPrevioTerminal"
    />
  `,
})
class HostComponent {
  estado:
    | 'Borrador'
    | 'Solicitado'
    | 'Aprobado'
    | 'EnEjecucion'
    | 'Consumido'
    | 'Rechazado'
    | 'Cancelado' = 'Borrador';
  fechaSolicitud: string | null = null;
  fechaAprobacion: string | null = null;
  fechaEnEjecucion: string | null = null;
  fechaConsumido: string | null = null;
  fechaTerminacion: string | null = null;
  estadoPrevioTerminal:
    | 'Borrador'
    | 'Solicitado'
    | 'Aprobado'
    | 'EnEjecucion'
    | 'Consumido'
    | 'Rechazado'
    | 'Cancelado'
    | null = null;
}

describe('StatusTimelineComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  function nodos(): HTMLLIElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('li.pre-timeline__nodo'),
    );
  }

  function tarjetaTerminal(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.pre-timeline-terminal');
  }

  function tarjetaTerminalRequerida(): HTMLElement {
    const card = tarjetaTerminal();
    if (!card) {
      throw new Error('No se encontró card terminal en el DOM');
    }
    return card;
  }

  it('renderiza los 5 nodos del happy path para Borrador con índice 0 actual', () => {
    host.estado = 'Borrador';
    fixture.detectChanges();

    expect(nodos()).toHaveLength(5);
    expect(nodos()[0].getAttribute('data-estado-nodo')).toBe('actual');
    expect(nodos()[0].getAttribute('aria-current')).toBe('step');
    expect(nodos()[1].getAttribute('data-estado-nodo')).toBe('futuro');
    expect(nodos()[4].getAttribute('data-estado-nodo')).toBe('futuro');
  });

  it('marca pasado/actual/futuro correctamente para Aprobado', () => {
    host.estado = 'Aprobado';
    fixture.detectChanges();

    const datos = nodos().map((n) => n.getAttribute('data-estado-nodo'));
    expect(datos).toEqual(['pasado', 'pasado', 'actual', 'futuro', 'futuro']);
  });

  it('todos los nodos pasados cuando estado es Consumido', () => {
    host.estado = 'Consumido';
    fixture.detectChanges();

    const datos = nodos().map((n) => n.getAttribute('data-estado-nodo'));
    expect(datos).toEqual(['pasado', 'pasado', 'pasado', 'pasado', 'actual']);
  });

  it('renderiza la etiqueta humana "En ejecución" para EnEjecucion', () => {
    host.estado = 'EnEjecucion';
    fixture.detectChanges();

    const etiquetas = nodos().map(
      (n) => n.querySelector('.pre-timeline__etiqueta')?.textContent?.trim(),
    );
    expect(etiquetas).toEqual([
      'Borrador',
      'Solicitado',
      'Aprobado',
      'En ejecución',
      'Consumido',
    ]);
  });

  it('muestra fecha bajo el nodo Solicitado cuando se proporciona fechaSolicitud', () => {
    host.estado = 'Aprobado';
    host.fechaSolicitud = '2026-03-12';
    fixture.detectChanges();

    const fechas = nodos().map((n) =>
      n.querySelector('.pre-timeline__fecha')?.textContent?.trim(),
    );
    expect(fechas[0]).toBeUndefined();
    expect(fechas[1]).toBe('12 mar 2026');
    expect(fechas[2]).toBeUndefined();
  });

  it('muestra fecha bajo el nodo Aprobado cuando se proporciona fechaAprobacion', () => {
    host.estado = 'EnEjecucion';
    host.fechaSolicitud = '2026-03-01';
    host.fechaAprobacion = '2026-03-15';
    fixture.detectChanges();

    const fechas = nodos().map((n) =>
      n.querySelector('.pre-timeline__fecha')?.textContent?.trim(),
    );
    expect(fechas[1]).toBe('1 mar 2026');
    expect(fechas[2]).toBe('15 mar 2026');
    expect(fechas[3]).toBeUndefined();
  });

  it('muestra fechas bajo EnEjecucion y Consumido cuando se proporcionan', () => {
    host.estado = 'Consumido';
    host.fechaSolicitud = '2026-03-01';
    host.fechaAprobacion = '2026-03-15';
    host.fechaEnEjecucion = '2026-04-02';
    host.fechaConsumido = '2026-05-20';
    fixture.detectChanges();

    const fechas = nodos().map((n) =>
      n.querySelector('.pre-timeline__fecha')?.textContent?.trim(),
    );
    expect(fechas[3]).toBe('2 abr 2026');
    expect(fechas[4]).toBe('20 may 2026');
  });

  it('omite la fecha bajo EnEjecucion/Consumido si los inputs son null', () => {
    host.estado = 'Consumido';
    host.fechaSolicitud = '2026-03-01';
    host.fechaAprobacion = '2026-03-15';
    fixture.detectChanges();

    const fechas = nodos().map((n) =>
      n.querySelector('.pre-timeline__fecha')?.textContent?.trim(),
    );
    expect(fechas[3]).toBeUndefined();
    expect(fechas[4]).toBeUndefined();
  });

  it('omite la fecha bajo Solicitado si fechaSolicitud es null', () => {
    host.estado = 'Solicitado';
    host.fechaSolicitud = null;
    fixture.detectChanges();

    const elementoFecha = nodos()[1].querySelector('.pre-timeline__fecha');
    expect(elementoFecha).toBeNull();
  });

  it('renderiza card terminal en lugar de stepper para Rechazado', () => {
    host.estado = 'Rechazado';
    host.fechaTerminacion = '2026-03-20';
    fixture.detectChanges();

    expect(nodos()).toHaveLength(0);
    const card = tarjetaTerminalRequerida();
    expect(card.getAttribute('data-estado')).toBe('Rechazado');
    expect(card.textContent).toContain('Rechazado');
    expect(card.textContent).toContain('20 mar 2026');
    expect(card.textContent).toContain('desde Solicitado');
  });

  it('renderiza card terminal para Cancelado infiriendo "desde Aprobado"', () => {
    host.estado = 'Cancelado';
    host.fechaTerminacion = '2026-04-05';
    fixture.detectChanges();

    const card = tarjetaTerminalRequerida();
    expect(card.textContent).toContain('Cancelado');
    expect(card.textContent).toContain('5 abr 2026');
    expect(card.textContent).toContain('desde Aprobado');
  });

  it('respeta estadoPrevioTerminal explícito sobre la inferencia por defecto', () => {
    host.estado = 'Cancelado';
    host.fechaTerminacion = '2026-04-05';
    host.estadoPrevioTerminal = 'EnEjecucion';
    fixture.detectChanges();

    const card = tarjetaTerminalRequerida();
    expect(card.textContent).toContain('desde En ejecución');
  });

  it('omite la fecha en card terminal cuando fechaTerminacion es null', () => {
    host.estado = 'Cancelado';
    host.fechaTerminacion = null;
    fixture.detectChanges();

    const card = tarjetaTerminalRequerida();
    expect(card.textContent).not.toContain('el ');
    expect(card.textContent).toContain('Cancelado');
    expect(card.textContent).toContain('desde Aprobado');
  });
});
