import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { PaginaNoEncontradaPage } from './pagina-no-encontrada.page';

describe('PaginaNoEncontradaPage', () => {
  let fixture: ComponentFixture<PaginaNoEncontradaPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginaNoEncontradaPage],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(PaginaNoEncontradaPage);
    fixture.detectChanges();
  });

  it('renderiza el copy genérico de 404', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('No se ha encontrado lo que buscabas');
    expect(root.textContent).toContain('Volver al inicio');
  });

  it('navega a /inicio al clicar el botón', () => {
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
