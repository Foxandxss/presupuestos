import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  type DensidadLista,
  ListToolbarComponent,
} from './list-toolbar.component';

@Component({
  standalone: true,
  imports: [ListToolbarComponent],
  template: `
    <pre-list-toolbar
      [query]="query()"
      [densidad]="densidad()"
      [hayFiltros]="hayFiltros()"
      [resumen]="resumen()"
      (queryChange)="onQuery($event)"
      (densidadChange)="onDensidad($event)"
      (limpiarFiltros)="onLimpiar()"
    >
      <span slot="filtros" data-testid="filtro">Filtro slot</span>
      <button slot="acciones" data-testid="accion">Acción slot</button>
    </pre-list-toolbar>
  `,
})
class HostComponent {
  query = signal('');
  densidad = signal<DensidadLista>('estandar');
  hayFiltros = signal(false);
  resumen = signal<string | null>(null);

  ultimaQuery: string | null = null;
  ultimaDensidad: DensidadLista | null = null;
  limpiarCount = 0;

  onQuery(v: string): void {
    this.ultimaQuery = v;
  }
  onDensidad(d: DensidadLista): void {
    this.ultimaDensidad = d;
  }
  onLimpiar(): void {
    this.limpiarCount += 1;
  }
}

describe('ListToolbarComponent', () => {
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

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('proyecta el contenido de los slots filtros y acciones', () => {
    expect(root().querySelector('[data-testid="filtro"]')).not.toBeNull();
    expect(root().querySelector('[data-testid="accion"]')).not.toBeNull();
  });

  it('emite queryChange al teclear en el search', () => {
    const input = root().querySelector(
      '.pre-list-toolbar__search-input',
    ) as HTMLInputElement;
    input.value = 'hola';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(host.ultimaQuery).toBe('hola');
  });

  it('muestra el botón de limpiar cuando hay query', () => {
    host.query.set('algo');
    fixture.detectChanges();
    expect(root().querySelector('.pre-list-toolbar__search-clear')).not.toBeNull();
  });

  it('toggle de densidad emite el opuesto', () => {
    const btn = root().querySelector(
      '.pre-list-toolbar__density',
    ) as HTMLButtonElement;
    btn.click();
    expect(host.ultimaDensidad).toBe('compacta');

    host.densidad.set('compacta');
    fixture.detectChanges();
    btn.click();
    expect(host.ultimaDensidad).toBe('estandar');
  });

  it('muestra resumen y botón Limpiar filtros cuando hayFiltros=true', () => {
    host.hayFiltros.set(true);
    host.resumen.set('Mostrando 3 de 10');
    fixture.detectChanges();

    expect(root().textContent).toContain('Mostrando 3 de 10');
    const limpiar = root().querySelector(
      '.pre-list-toolbar__clear',
    ) as HTMLButtonElement;
    expect(limpiar).not.toBeNull();
    limpiar.click();
    expect(host.limpiarCount).toBe(1);
  });

  it('no muestra summary cuando no hay filtros ni resumen', () => {
    expect(root().querySelector('.pre-list-toolbar__summary')).toBeNull();
  });

  it('oculta search cuando mostrarSearch=false', async () => {
    @Component({
      standalone: true,
      imports: [ListToolbarComponent],
      template: `<pre-list-toolbar [mostrarSearch]="false" />`,
    })
    class SinSearch {}

    await TestBed.resetTestingModule()
      .configureTestingModule({ imports: [SinSearch] })
      .compileComponents();
    const f = TestBed.createComponent(SinSearch);
    f.detectChanges();
    expect(
      (f.nativeElement as HTMLElement).querySelector(
        '.pre-list-toolbar__search',
      ),
    ).toBeNull();
  });
});
