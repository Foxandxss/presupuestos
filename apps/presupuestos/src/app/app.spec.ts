import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { App } from './app';

describe('App', () => {
  let httpController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpController.verify());

  it('renders the app title and the health response', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    httpController.expectOne('/api/health').flush({ status: 'ok' });
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Presupuestos');
    expect(compiled.textContent).toContain('ok');
  });
});
