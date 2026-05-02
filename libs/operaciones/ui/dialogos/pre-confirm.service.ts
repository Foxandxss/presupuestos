import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

/**
 * Opciones de un confirm canonico.
 *
 * Los tres campos son requeridos para evitar diálogos genéricos
 * (ej. "¿Estás seguro? · Aceptar") por descuido.
 */
export interface PreConfirmOpciones {
  /** Header del diálogo. Ej: "Eliminar proveedor". */
  titulo: string;
  /** Cuerpo del diálogo. Ej: '¿Eliminar el proveedor "Acme"? Esta acción es irreversible.'. */
  mensaje: string;
  /** Label del botón accept. Ej: "Eliminar proveedor". Sustituye al genérico "Aceptar". */
  accionLabel: string;
}

/**
 * Servicio canónico para confirmar acciones del usuario.
 *
 * Wrappea `ConfirmationService` de PrimeNG con dos métodos opinados:
 * - `destructivo`: botón accept rojo (`severity: 'danger'`) + icono warning.
 * - `normal`: botón accept primary (violet) + icono question.
 *
 * Ambos resuelven `Promise<boolean>`: `true` en accept, `false` en reject /
 * cierre por X / Esc.
 *
 * Requiere que el shell de la app monte un único `<p-confirmDialog>` (sin
 * key) que escuche al `ConfirmationService`. No se monta uno por página.
 */
@Injectable({ providedIn: 'root' })
export class PreConfirm {
  private readonly confirmation = inject(ConfirmationService);

  /**
   * Lanza un confirm con visual destructivo (botón rojo, icono warning).
   * Usar para acciones irreversibles: eliminar, cancelar pedido, rechazar.
   */
  destructivo(opciones: PreConfirmOpciones): Promise<boolean> {
    return this.lanzar(opciones, 'destructivo');
  }

  /**
   * Lanza un confirm con visual normal (botón violet primary, icono question).
   * Usar para acciones reversibles: aprobar pedido, solicitar pedido.
   */
  normal(opciones: PreConfirmOpciones): Promise<boolean> {
    return this.lanzar(opciones, 'normal');
  }

  private lanzar(
    opciones: PreConfirmOpciones,
    modo: 'destructivo' | 'normal',
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let resuelto = false;
      const cerrar = (valor: boolean) => {
        if (resuelto) return;
        resuelto = true;
        resolve(valor);
      };
      this.confirmation.confirm({
        header: opciones.titulo,
        message: opciones.mensaje,
        icon:
          modo === 'destructivo'
            ? 'pi pi-exclamation-triangle'
            : 'pi pi-question-circle',
        acceptLabel: opciones.accionLabel,
        rejectLabel: 'Cancelar',
        dismissableMask: false,
        closeOnEscape: true,
        acceptButtonProps: {
          severity: modo === 'destructivo' ? 'danger' : 'primary',
          label: opciones.accionLabel,
        },
        rejectButtonProps: {
          severity: 'secondary',
          text: true,
          label: 'Cancelar',
        },
        accept: () => cerrar(true),
        reject: () => cerrar(false),
      });
    });
  }
}
