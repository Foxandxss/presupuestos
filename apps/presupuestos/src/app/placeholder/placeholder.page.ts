import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [CardModule],
  template: `
    <div class="mx-auto max-w-2xl">
      <p-card [header]="titulo()" subheader="Próximamente">
        <p class="text-slate-700">
          Esta sección estará disponible en próximas iteraciones.
        </p>
      </p-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderPage {
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data, { initialValue: {} });
  protected readonly titulo = computed<string>(
    () => (this.data() as { titulo?: string }).titulo ?? 'Sección',
  );
}
