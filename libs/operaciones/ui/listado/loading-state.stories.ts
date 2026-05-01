import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { LoadingStateComponent } from './loading-state.component';

const meta: Meta<LoadingStateComponent> = {
  title: 'Listado / loading-state',
  component: LoadingStateComponent,
  decorators: [
    moduleMetadata({ imports: [LoadingStateComponent] }),
    (storyFn) => {
      const story = storyFn();
      return {
        ...story,
        template: `<div class="sb-fixed-width">${story.template ?? ''}</div>`,
      };
    },
  ],
  argTypes: {
    cuenta: { control: { type: 'number', min: 1, max: 12, step: 1 } },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Skeleton shimmer canonico para listas en carga. Cada fila simula 4 celdas. La animacion se desactiva con prefers-reduced-motion.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<LoadingStateComponent>;

export const SkeletonTabla: Story = {
  args: { cuenta: 5 },
};

export const SkeletonCorto: Story = {
  args: { cuenta: 2 },
  parameters: {
    docs: {
      description: {
        story: 'Skeleton corto para cards / paneles pequenos.',
      },
    },
  },
};

export const SkeletonLargo: Story = {
  args: { cuenta: 10 },
  parameters: {
    docs: {
      description: {
        story:
          'Skeleton largo para listas que tipicamente devuelven 10+ filas (eg. /pedidos pagina de 25).',
      },
    },
  },
};
