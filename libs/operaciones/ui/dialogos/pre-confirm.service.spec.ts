import { TestBed } from '@angular/core/testing';
import { ConfirmationService, type Confirmation } from 'primeng/api';

import { PreConfirm } from './pre-confirm.service';

class ConfirmationServiceMock {
  ultima: Confirmation | null = null;
  confirm(opciones: Confirmation): this {
    this.ultima = opciones;
    return this;
  }
}

describe('PreConfirm', () => {
  let service: PreConfirm;
  let confirmationMock: ConfirmationServiceMock;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PreConfirm,
        { provide: ConfirmationService, useClass: ConfirmationServiceMock },
      ],
    });
    service = TestBed.inject(PreConfirm);
    confirmationMock = TestBed.inject(
      ConfirmationService,
    ) as unknown as ConfirmationServiceMock;
  });

  it('destructivo pasa titulo, mensaje y accionLabel a ConfirmationService', () => {
    void service.destructivo({
      titulo: 'Eliminar proveedor',
      mensaje: '¿Eliminar el proveedor "Acme"?',
      accionLabel: 'Eliminar proveedor',
    });
    const c = confirmationMock.ultima;
    expect(c).not.toBeNull();
    expect(c?.header).toBe('Eliminar proveedor');
    expect(c?.message).toBe('¿Eliminar el proveedor "Acme"?');
    expect(c?.acceptLabel).toBe('Eliminar proveedor');
  });

  it('destructivo aplica severity danger al boton accept', () => {
    void service.destructivo({
      titulo: 't',
      mensaje: 'm',
      accionLabel: 'Borrar',
    });
    const props = confirmationMock.ultima?.acceptButtonProps as
      | { severity?: string }
      | undefined;
    expect(props?.severity).toBe('danger');
  });

  it('normal NO aplica severity danger (deja primary default)', () => {
    void service.normal({
      titulo: 't',
      mensaje: 'm',
      accionLabel: 'Aprobar pedido',
    });
    const props = confirmationMock.ultima?.acceptButtonProps as
      | { severity?: string }
      | undefined;
    expect(props?.severity).not.toBe('danger');
  });

  it('siempre pone "Cancelar" como label del reject', () => {
    void service.destructivo({
      titulo: 't',
      mensaje: 'm',
      accionLabel: 'Borrar',
    });
    expect(confirmationMock.ultima?.rejectLabel).toBe('Cancelar');
    void service.normal({
      titulo: 't',
      mensaje: 'm',
      accionLabel: 'Aprobar',
    });
    expect(confirmationMock.ultima?.rejectLabel).toBe('Cancelar');
  });

  it('reject button props son secondary text (boton terciario)', () => {
    void service.destructivo({
      titulo: 't',
      mensaje: 'm',
      accionLabel: 'Borrar',
    });
    const props = confirmationMock.ultima?.rejectButtonProps as
      | { severity?: string; text?: boolean }
      | undefined;
    expect(props?.severity).toBe('secondary');
    expect(props?.text).toBe(true);
  });

  it('dismissableMask=false (click en mask no cierra)', () => {
    void service.destructivo({
      titulo: 't',
      mensaje: 'm',
      accionLabel: 'Borrar',
    });
    expect(confirmationMock.ultima?.dismissableMask).toBe(false);
  });

  it('Esc sigue cerrando (closeOnEscape=true)', () => {
    void service.destructivo({
      titulo: 't',
      mensaje: 'm',
      accionLabel: 'Borrar',
    });
    expect(confirmationMock.ultima?.closeOnEscape).toBe(true);
  });

  it('destructivo resuelve true cuando se invoca el accept callback', async () => {
    const promesa = service.destructivo({
      titulo: 't',
      mensaje: 'm',
      accionLabel: 'Borrar',
    });
    confirmationMock.ultima?.accept?.();
    await expect(promesa).resolves.toBe(true);
  });

  it('destructivo resuelve false cuando se invoca el reject callback', async () => {
    const promesa = service.destructivo({
      titulo: 't',
      mensaje: 'm',
      accionLabel: 'Borrar',
    });
    confirmationMock.ultima?.reject?.();
    await expect(promesa).resolves.toBe(false);
  });

  it('normal resuelve true en accept y false en reject', async () => {
    const aceptada = service.normal({
      titulo: 't',
      mensaje: 'm',
      accionLabel: 'Aprobar',
    });
    confirmationMock.ultima?.accept?.();
    await expect(aceptada).resolves.toBe(true);

    const rechazada = service.normal({
      titulo: 't',
      mensaje: 'm',
      accionLabel: 'Aprobar',
    });
    confirmationMock.ultima?.reject?.();
    await expect(rechazada).resolves.toBe(false);
  });

  it('si accept y reject se invocan ambos, sólo gana el primero (no hay double-resolve)', async () => {
    const promesa = service.destructivo({
      titulo: 't',
      mensaje: 'm',
      accionLabel: 'Borrar',
    });
    confirmationMock.ultima?.reject?.();
    confirmationMock.ultima?.accept?.();
    await expect(promesa).resolves.toBe(false);
  });

  it('destructivo usa icono warning, normal usa icono question', () => {
    void service.destructivo({
      titulo: 't',
      mensaje: 'm',
      accionLabel: 'Borrar',
    });
    expect(confirmationMock.ultima?.icon).toContain('exclamation');
    void service.normal({
      titulo: 't',
      mensaje: 'm',
      accionLabel: 'Aprobar',
    });
    expect(confirmationMock.ultima?.icon).toContain('question');
  });
});
