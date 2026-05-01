import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InlineEditComponent } from './inline-edit.component';

@Component({
  standalone: true,
  imports: [InlineEditComponent],
  template: `
    <pre-inline-edit
      [valor]="valor()"
      [editable]="editable()"
      (guardar)="onGuardar($event)"
    />
  `,
})
class HostComponent {
  valor = signal('Acme');
  editable = signal(true);
  ultimoGuardado: string | null = null;
  guardarCount = 0;

  onGuardar(v: string): void {
    this.ultimoGuardado = v;
    this.guardarCount += 1;
  }
}

describe('InlineEditComponent', () => {
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

  function valorEl(): HTMLElement {
    return root().querySelector('.pre-inline-edit__valor') as HTMLElement;
  }

  function inputEl(): HTMLInputElement | null {
    return root().querySelector(
      '.pre-inline-edit__input',
    ) as HTMLInputElement | null;
  }

  it('muestra el valor en modo lectura por defecto', () => {
    expect(valorEl()).not.toBeNull();
    expect(valorEl().textContent?.trim()).toBe('Acme');
    expect(inputEl()).toBeNull();
  });

  function abrirEdicion(): HTMLInputElement {
    valorEl().dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    fixture.detectChanges();
    const input = inputEl();
    if (!input) throw new Error('input no rendered');
    return input;
  }

  it('doble click activa edición y enfoca el input', async () => {
    const input = abrirEdicion();
    await fixture.whenStable();
    expect(input.value).toBe('Acme');
  });

  it('Enter confirma y emite guardar cuando cambia', async () => {
    const input = abrirEdicion();
    await fixture.whenStable();
    input.value = 'Acme Industries';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    fixture.detectChanges();
    expect(host.ultimoGuardado).toBe('Acme Industries');
    expect(host.guardarCount).toBe(1);
  });

  it('Esc cancela y no emite', async () => {
    const input = abrirEdicion();
    await fixture.whenStable();
    input.value = 'Otro';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();
    expect(host.guardarCount).toBe(0);
    expect(inputEl()).toBeNull();
  });

  it('no emite si el valor no cambió', async () => {
    const input = abrirEdicion();
    await fixture.whenStable();
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    fixture.detectChanges();
    expect(host.guardarCount).toBe(0);
  });

  it('no emite cuando el borrador queda por debajo del mínimo', async () => {
    const input = abrirEdicion();
    await fixture.whenStable();
    input.value = '';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    fixture.detectChanges();
    expect(host.guardarCount).toBe(0);
    expect(inputEl()).toBeNull();
  });

  it('cuando editable=false ignora el doble click', () => {
    host.editable.set(false);
    fixture.detectChanges();
    valorEl().dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    fixture.detectChanges();
    expect(inputEl()).toBeNull();
  });
});
