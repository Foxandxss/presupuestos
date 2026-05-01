import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';

import type { Rol } from '../../dominio';
import { CommandPaletteComponent } from './command-palette.component';
import { SearchApi } from './search.api';
import { RESULTADO_VACIO, type SearchResult } from './search.types';

class SearchApiStub {
  ultimaQuery: string | null = null;
  resultadoSiguiente: SearchResult = RESULTADO_VACIO;

  buscar(q: string): Observable<SearchResult> {
    this.ultimaQuery = q;
    return of(this.resultadoSiguiente);
  }
}

@Component({
  standalone: true,
  imports: [CommandPaletteComponent],
  template: `
    <pre-command-palette
      [abierto]="abierto()"
      [rol]="rol()"
      (cerrar)="onCerrar()"
      (navegar)="onNavegar($event)"
    />
  `,
})
class HostComponent {
  abierto = signal(false);
  rol = signal<Rol>('admin');
  cerrarCount = 0;
  navegarUltima: string | null = null;
  onCerrar(): void {
    this.cerrarCount += 1;
  }
  onNavegar(ruta: string): void {
    this.navegarUltima = ruta;
  }
}

describe('CommandPaletteComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let api: SearchApiStub;

  beforeEach(async () => {
    api = new SearchApiStub();
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SearchApi, useValue: api },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function abrir(): void {
    host.abierto.set(true);
    fixture.detectChanges();
  }

  it('no renderiza nada mientras está cerrado', () => {
    expect(root().querySelector('.pre-palette')).toBeNull();
  });

  it('renderiza el modal cuando abierto=true', () => {
    abrir();
    expect(root().querySelector('.pre-palette')).not.toBeNull();
  });

  it('muestra acciones rápidas y navegación cuando no hay query', () => {
    abrir();
    const labels = root().querySelectorAll('.pre-palette__group-label');
    const textos = Array.from(labels).map((el) => el.textContent?.trim());
    expect(textos).toContain('Acciones rápidas');
    expect(textos).toContain('Ir a');
  });

  it('admin ve la acción "Crear pedido"', () => {
    abrir();
    expect(root().textContent).toContain('Crear pedido');
  });

  it('consultor NO ve la acción "Crear pedido"', () => {
    host.rol.set('consultor');
    abrir();
    expect(root().textContent).not.toContain('Crear pedido');
  });

  it('admin ve los items de Reportes en navegación', () => {
    abrir();
    expect(root().textContent).toContain('Reportes · Pedidos');
    expect(root().textContent).toContain('Reportes · Facturación');
  });

  it('consultor NO ve los items de Reportes', () => {
    host.rol.set('consultor');
    abrir();
    expect(root().textContent).not.toContain('Reportes · Pedidos');
    expect(root().textContent).not.toContain('Reportes · Facturación');
  });

  it('emite cerrar al hacer click en el backdrop', () => {
    abrir();
    const backdrop = root().querySelector('.pre-palette__backdrop') as HTMLElement;
    backdrop.click();
    expect(host.cerrarCount).toBe(1);
  });

  it('NO cierra al hacer click dentro del panel', () => {
    abrir();
    const panel = root().querySelector('.pre-palette') as HTMLElement;
    panel.click();
    expect(host.cerrarCount).toBe(0);
  });

  it('emite cerrar al pulsar Escape', () => {
    abrir();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(host.cerrarCount).toBe(1);
  });

  it('seleccionar un item de navegación emite navegar y cerrar', () => {
    abrir();
    const buttons = Array.from(
      root().querySelectorAll<HTMLButtonElement>('.pre-palette__item'),
    );
    const inicio = buttons.find((b) => b.textContent?.includes('Inicio'));
    inicio?.click();
    expect(host.navegarUltima).toBe('/inicio');
    expect(host.cerrarCount).toBe(1);
  });

  it('reset de query/foco al reabrir', () => {
    abrir();
    const input = root().querySelector('.pre-palette__input') as HTMLInputElement;
    input.value = 'foo';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    host.abierto.set(false);
    fixture.detectChanges();
    abrir();

    const inputDespues = root().querySelector('.pre-palette__input') as HTMLInputElement;
    expect(inputDespues.value).toBe('');
  });

  it('Enter sobre un item navega a su ruta', () => {
    abrir();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    // Primer item visible cuando no hay query: "Crear pedido" para admin
    expect(host.navegarUltima).toBe('/pedidos');
  });

  it('ArrowDown mueve la selección al siguiente item', () => {
    abrir();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    // Item index 1 — para admin: "Registrar consumo" (acciones), ruta /consumos
    expect(host.navegarUltima).toBe('/consumos');
  });
});
