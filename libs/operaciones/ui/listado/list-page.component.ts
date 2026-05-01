import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'pre-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pre-list-page">
      <ng-content select="[slot=header]" />
      <ng-content select="[slot=toolbar]" />
      <div class="pre-list-page__body">
        <ng-content />
      </div>
    </div>
  `,
  styles: [
    `
      .pre-list-page {
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-width: 1280px;
        margin: 0 auto;
      }
      .pre-list-page__body {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
    `,
  ],
})
export class ListPageComponent {}
