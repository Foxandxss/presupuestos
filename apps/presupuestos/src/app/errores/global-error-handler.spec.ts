import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  let handler: ErrorHandler;
  let router: Router;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    sessionStorage.clear();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ErrorHandler, useClass: GlobalErrorHandler },
      ],
    });
    handler = TestBed.inject(ErrorHandler);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('navega a /error tras error no capturado', () => {
    const spy = jest.spyOn(router, 'navigateByUrl').mockReturnValue(
      Promise.resolve(true),
    );
    handler.handleError(new Error('boom'));
    expect(spy).toHaveBeenCalledWith('/error');
  });

  it('persiste la ruta previa en sessionStorage', () => {
    Object.defineProperty(router, 'url', { value: '/pedidos/142', configurable: true });
    jest.spyOn(router, 'navigateByUrl').mockReturnValue(Promise.resolve(true));
    handler.handleError(new Error('boom'));
    expect(sessionStorage.getItem('pre-error-ruta-previa')).toBe('/pedidos/142');
  });

  it('no navega de nuevo si ya estamos en /error', () => {
    Object.defineProperty(router, 'url', { value: '/error', configurable: true });
    const spy = jest.spyOn(router, 'navigateByUrl').mockReturnValue(
      Promise.resolve(true),
    );
    handler.handleError(new Error('boom'));
    expect(spy).not.toHaveBeenCalled();
  });
});
