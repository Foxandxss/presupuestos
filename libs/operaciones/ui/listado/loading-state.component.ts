import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'pre-loading-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pre-loading-state" role="status" aria-label="Cargando">
      @for (_ of filas(); track $index) {
        <div class="pre-loading-state__row">
          <span class="pre-loading-state__cell pre-loading-state__cell--sm"></span>
          <span class="pre-loading-state__cell"></span>
          <span class="pre-loading-state__cell pre-loading-state__cell--sm"></span>
          <span class="pre-loading-state__cell pre-loading-state__cell--xs"></span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .pre-loading-state {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 12px 0;
      }
      .pre-loading-state__row {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 12px 16px;
        background-color: var(--surface-card);
        border-bottom: 1px solid var(--border-subtle);
      }
      .pre-loading-state__cell {
        flex: 1;
        height: 12px;
        border-radius: var(--radius-xs);
        background: linear-gradient(
          90deg,
          var(--surface-muted) 25%,
          var(--border-subtle) 50%,
          var(--surface-muted) 75%
        );
        background-size: 200% 100%;
        animation: pre-loading-shimmer 1.4s infinite;
      }
      .pre-loading-state__cell--sm {
        max-width: 96px;
      }
      .pre-loading-state__cell--xs {
        max-width: 56px;
      }
      @keyframes pre-loading-shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .pre-loading-state__cell {
          animation: none;
        }
      }
    `,
  ],
})
export class LoadingStateComponent {
  readonly cuenta = input<number>(5);
  protected readonly filas = computed(() =>
    Array.from({ length: Math.max(1, this.cuenta()) }, (_, i) => i),
  );
}
