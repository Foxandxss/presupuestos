import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

interface HealthResponse {
  status: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CardModule, TagModule],
  templateUrl: './home.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly http = inject(HttpClient);

  protected readonly health = signal<HealthResponse | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.http.get<HealthResponse>('/api/health').subscribe({
      next: (response) => this.health.set(response),
      error: (err: { message?: string }) =>
        this.error.set(err.message ?? 'Error desconocido'),
    });
  }
}
