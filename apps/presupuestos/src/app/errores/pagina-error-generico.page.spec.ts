import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { PaginaErrorGenericoPage } from './pagina-error-generico.page';

describe('PaginaErrorGenericoPage', () => {
  let fixture: ComponentFixture<PaginaErrorGenericoPage>;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PaginaErrorGenericoPage],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(PaginaErrorGenericoPage);
    fixture.detectChanges();
  });

  it('renderiza el copy genérico de 500', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Algo ha fallado');
    expect(root.textContent).toContain(
      'Vuelve a intentarlo en unos minutos. Si persiste, contacta con tu administrador.',
    );
    expect(root.textContent).toContain('Reintentar');
  });

  it('reintenta navegando a la ruta previa cuando existe en sessionStorage', () => {
    sessionStorage.setItem('pre-error-ruta-previa', '/pedidos/142');
    const router = TestBed.inject(Router);
    const spy = jest.spyOn(router, 'navigateByUrl').mockReturnValue(
      Promise.resolve(true),
    );
    const btn = (fixture.nativeElement as HTMLElement).querySelector(
      '.pre-error-state__retry',
    ) as HTMLButtonElement;
    btn.click();
    expect(spy).toHaveBeenCalledWith('/pedidos/142');
    expect(sessionStorage.getItem('pre-error-ruta-previa')).toBeNull();
  });

  it('reintenta navegando a /inicio cuando no hay ruta previa', () => {
    const router = TestBed.inject(Router);
    const spy = jest.spyOn(router, 'navigateByUrl').mockReturnValue(
      Promise.resolve(true),
    );
    const btn = (fixture.nativeElement as HTMLElement).querySelector(
      '.pre-error-state__retry',
    ) as HTMLButtonElement;
    btn.click();
    expect(spy).toHaveBeenCalledWith('/inicio');
  });
});
