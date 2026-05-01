import type { RespuestaErrorDominio } from '@operaciones/dominio';

const COPYS_POR_CODIGO: Record<string, (fields?: Record<string, unknown>) => string> = {
  transicion_ilegal: () =>
    'No es posible realizar esa transición sobre el pedido en su estado actual.',
  pedido_no_activo: () =>
    'El pedido no admite registros de consumo en su estado actual.',
  recurso_otro_proveedor: () =>
    'El recurso seleccionado no pertenece al proveedor del pedido.',
  mes_fuera_de_ventana: () =>
    'El mes elegido cae fuera de la ventana de la línea.',
  consumo_duplicado: () =>
    'Ya existe un consumo para esa combinación de línea, recurso, mes y año.',
  excede_horas_ofertadas: (fields) => {
    const disponibles = fields?.['disponibles'];
    if (typeof disponibles === 'number') {
      return `Sobrepasa el límite de horas ofertadas (quedan ${disponibles} h disponibles).`;
    }
    return 'Sobrepasa el límite de horas ofertadas.';
  },
  proyecto_con_pedidos: () =>
    'No se puede eliminar: el proyecto tiene pedidos asociados. Cancela los pedidos antes.',
};

/**
 * Traduce la respuesta normalizada del backend ({ code, message, fields? }) a
 * un copy específico de dominio en español. Cuando el código no es conocido,
 * cae en `error.message` para no perder información.
 */
export function mapearErrorACopy(error: RespuestaErrorDominio): string {
  const handler = COPYS_POR_CODIGO[error.code];
  if (handler) {
    return handler(error.fields);
  }
  return error.message;
}
