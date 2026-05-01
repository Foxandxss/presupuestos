import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'pre-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="pre-page-header">
      <div class="pre-page-header__text">
        <h1 class="pre-page-header__title">{{ titulo() }}</h1>
        @if (descripcion(); as d) {
          <p class="pre-page-header__description">{{ d }}</p>
        }
      </div>
      <div class="pre-page-header__actions">
        <ng-content select="[slot=actions]" />
      </div>
    </header>
  `,
  styles: [
    `
      .pre-page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 24px;
      }
      .pre-page-header__text {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .pre-page-header__title {
        font-size: 24px;
        font-weight: 600;
        color: var(--text-default);
        line-height: 32px;
        letter-spacing: -0.01em;
        margin: 0;
      }
      .pre-page-header__description {
        font-size: 13px;
        color: var(--text-subtle);
        margin: 0;
      }
      .pre-page-header__actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
    `,
  ],
})
export class PageHeaderComponent {
  readonly titulo = input.required<string>();
  readonly descripcion = input<string | null>(null);
}
