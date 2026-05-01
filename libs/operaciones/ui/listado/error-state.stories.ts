import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { ErrorStateComponent } from './error-state.component';

const meta: Meta<ErrorStateComponent> = {
  title: 'Listado / error-state',
  component: ErrorStateComponent,
  decorators: [
    moduleMetadata({ imports: [ErrorStateComponent] }),
    (storyFn) => {
      const story = storyFn();
      return {
        ...story,
        template: `<div class="sb-fixed-width">${story.template ?? ''}</div>`,
      };
    },
  ],
  argTypes: {
    iconoNombre: {
      control: { type: 'select' },
      options: [
        'errorCarga',
        'errorGenerico',
        'recursoNoEncontrado',
        'advertencia',
      ],
    },
    mostrarAccion: { control: { type: 'boolean' } },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Card de error reutilizada en errores inline (lista que falla al cargar) y como root component de las paginas 404 / 500. iconoNombre selecciona del map ICONOS; etiquetaAccion sustituye el texto del boton.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<ErrorStateComponent>;

export const InlineCarga: Story = {
  args: {
    titulo: 'No se pudieron cargar los pedidos',
    descripcion: 'Comprueba tu conexion y vuelve a intentarlo.',
    iconoNombre: 'errorCarga',
    etiquetaAccion: 'Reintentar',
    mostrarAccion: true,
  },
};

export const Pagina404: Story = {
  args: {
    titulo: 'No se ha encontrado lo que buscabas',
    descripcion: 'La pagina o recurso al que intentas acceder no existe.',
    iconoNombre: 'recursoNoEncontrado',
    etiquetaAccion: 'Volver al inicio',
    mostrarAccion: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Variante usada por la pagina /404 wildcard de la app.',
      },
    },
  },
};

export const Pagina500: Story = {
  args: {
    titulo: 'Algo ha fallado',
    descripcion:
      'Vuelve a intentarlo en unos minutos. Si persiste, contacta con tu administrador.',
    iconoNombre: 'errorGenerico',
    etiquetaAccion: 'Reintentar',
    mostrarAccion: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Variante usada por la pagina /error que dispara el ErrorHandler global.',
      },
    },
  },
};
