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
  selector: 'app-root',
  standalone: true,
  imports: [CardModule, TagModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly http = inject(HttpClient);

  protected readonly title = 'presupuestos';
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
