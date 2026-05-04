import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreFieldComponent } from './pre-field.component';

@Component({
  standalone: true,
  imports: [PreFieldComponent],
  template: `
    <pre-field
      [label]="label()"
      [controlId]="controlId()"
      [error]="error()"
      [hint]="hint()"
      [requerido]="requerido()"
      [ariaLabel]="ariaLabel()"
    >
      @if (controlConAriaLabel()) {
        <input class="control-test" [attr.aria-label]="'Campo demo'" />
      } @else {
        <input class="control-test" [id]="controlId() || ''" />
      }
    </pre-field>
  `,
})
class HostComponent {
  label = signal<string | null | undefined>('Nombre');
  controlId = signal<string | null | undefined>('campo-demo');
  error = signal<string | null | undefined>(null);
  hint = signal<string | null | undefined>(null);
  requerido = signal(false);
  ariaLabel = signal<string | null | undefined>(null);
  controlConAriaLabel = signal(false);
}

describe('PreFieldComponent', () => {
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

  it('renderiza el <label> cuando label esta presente', () => {
    const lbl = root().querySelector('.pre-field__label');
    expect(lbl).not.toBeNull();
    expect(lbl?.textContent?.trim()).toContain('Nombre');
  });

  it('no renderiza el <label> cuando label esta ausente', () => {
    host.label.set(null);
    host.ariaLabel.set('Aria override');
    fixture.detectChanges();
    expect(root().querySelector('.pre-field__label')).toBeNull();
  });

  it('vincula <label for> al controlId cuando ambos estan presentes', () => {
    host.controlId.set('mi-campo');
    fixture.detectChanges();
    const lbl = root().querySelector(
      '.pre-field__label',
    ) as HTMLLabelElement | null;
    expect(lbl?.getAttribute('for')).toBe('mi-campo');
  });

  it('renderiza error solo cuando truthy', () => {
    expect(root().querySelector('.pre-field__error')).toBeNull();
    host.error.set('Campo obligatorio');
    fixture.detectChanges();
    const err = root().querySelector('.pre-field__error');
    expect(err?.textContent?.trim()).toBe('Campo obligatorio');
  });

  it('renderiza hint solo cuando truthy', () => {
    expect(root().querySelector('.pre-field__hint')).toBeNull();
    host.hint.set('Mininum 8 caracteres');
    fixture.detectChanges();
    const h = root().querySelector('.pre-field__hint');
    expect(h?.textContent?.trim()).toBe('Mininum 8 caracteres');
  });

  it('renderiza asterisco junto al label cuando requerido=true', () => {
    expect(root().querySelector('.pre-field__requerido')).toBeNull();
    host.requerido.set(true);
    fixture.detectChanges();
    expect(root().querySelector('.pre-field__requerido')).not.toBeNull();
  });

  it('renderiza error y hint simultaneamente cuando ambos estan presentes', () => {
    host.error.set('Error visible');
    host.hint.set('Hint visible');
    fixture.detectChanges();
    expect(root().querySelector('.pre-field__error')).not.toBeNull();
    expect(root().querySelector('.pre-field__hint')).not.toBeNull();
  });

  it('proyecta el control via <ng-content>', () => {
    const control = root().querySelector('.pre-field__control .control-test');
    expect(control).not.toBeNull();
  });

  it('emite console.warn en dev cuando no hay label ni aria-label ni el control proyectado tiene aria-label', async () => {
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation((..._args: unknown[]): void => undefined);
    // Reset y crea uno nuevo sin label / aria-label / aria-label en control.
    host.label.set(null);
    host.ariaLabel.set(null);
    host.controlConAriaLabel.set(false);
    // Forzamos re-render del PreFieldComponent destruyendo el fixture.
    fixture.destroy();
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.label.set(null);
    fixture.componentInstance.ariaLabel.set(null);
    fixture.componentInstance.controlConAriaLabel.set(false);
    fixture.detectChanges();
    await Promise.resolve();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('NO emite console.warn cuando el control proyectado tiene aria-label', async () => {
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation((..._args: unknown[]): void => undefined);
    fixture.destroy();
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.label.set(null);
    fixture.componentInstance.ariaLabel.set(null);
    fixture.componentInstance.controlConAriaLabel.set(true);
    fixture.detectChanges();
    await Promise.resolve();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
