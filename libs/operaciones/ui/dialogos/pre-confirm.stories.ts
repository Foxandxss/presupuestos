import { Component, inject, signal } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { providePrimeNG } from 'primeng/config';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { PreConfirm } from './pre-confirm.service';

@Component({
  selector: 'pre-confirm-demo',
  standalone: true,
  imports: [ButtonModule, ConfirmDialogModule],
  template: `
    <p-confirmDialog />
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <p style="margin: 0; max-width: 28rem; color: var(--text-subtle);">
        {{ descripcion }}
      </p>
      <div style="display: flex; gap: 12px;">
        <p-button
          severity="danger"
          icon="pi pi-trash"
          label="Eliminar proveedor"
          (onClick)="lanzarDestructivo()"
        />
        <p-button
          icon="pi pi-check"
          label="Aprobar pedido"
          (onClick)="lanzarNormal()"
        />
      </div>
      <div
        style="font-size: 12px; color: var(--text-muted); min-height: 16px;"
      >
        @if (resultado(); as r) {
          Última respuesta: <strong>{{ r }}</strong>
        }
      </div>
    </div>
  `,
})
class PreConfirmDemo {
  private readonly confirm = inject(PreConfirm);

  descripcion =
    'Pulsa un botón para lanzar un confirm. El destructivo abre con accept rojo + icono warning; el normal con primary + icono question.';

  resultado = signal<string | null>(null);

  async lanzarDestructivo(): Promise<void> {
    const ok = await this.confirm.destructivo({
      titulo: 'Eliminar proveedor',
      mensaje: '¿Eliminar el proveedor "Acme S.L."? Esta acción es irreversible.',
      accionLabel: 'Eliminar proveedor',
    });
    this.resultado.set(ok ? 'aceptado (true)' : 'cancelado (false)');
  }

  async lanzarNormal(): Promise<void> {
    const ok = await this.confirm.normal({
      titulo: 'Aprobar pedido',
      mensaje:
        '¿Aprobar el pedido #142? El proveedor podrá empezar a registrar consumos.',
      accionLabel: 'Aprobar pedido',
    });
    this.resultado.set(ok ? 'aceptado (true)' : 'cancelado (false)');
  }
}

const meta: Meta<PreConfirmDemo> = {
  title: 'Dialogos / pre-confirm',
  component: PreConfirmDemo,
  decorators: [
    moduleMetadata({ imports: [PreConfirmDemo] }),
    applicationConfig({
      providers: [
        provideAnimationsAsync(),
        providePrimeNG({}),
        ConfirmationService,
      ],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Servicio canónico para confirmar acciones del usuario. `destructivo()` muestra accept rojo + icono warning para acciones irreversibles; `normal()` deja el primary default (violet) + icono question para acciones reversibles. Ambos resuelven `Promise<boolean>` (true en accept, false en reject / Esc / cierre por X). Click en mask deshabilitado.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<PreConfirmDemo>;

export const Destructivo: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Confirm destructivo. Botón accept rojo (`severity: "danger"`), icono warning, copy específico del dominio en lugar de "¿Estás seguro?" genérico. Para acciones irreversibles: eliminar, cancelar pedido, rechazar.',
      },
    },
  },
  play: async () => {
    // El usuario debe pulsar manualmente el botón "Eliminar proveedor" en la
    // story. La play function deja el estado preparado para la demo.
  },
};

export const Normal: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Confirm normal. Botón accept primary (violet por preset Aura), icono question. Para acciones reversibles que igual quieren un freno consciente: aprobar pedido, solicitar pedido.',
      },
    },
  },
};
