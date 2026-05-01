import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import {
  type CodigoErrorDominio,
  DomainError,
  type RespuestaErrorDominio,
} from '@operaciones/dominio';

const STATUS_POR_CODIGO: Partial<Record<CodigoErrorDominio, HttpStatus>> = {
  transicion_ilegal: HttpStatus.CONFLICT,
  proyecto_con_pedidos: HttpStatus.CONFLICT,
  pedido_no_activo: HttpStatus.UNPROCESSABLE_ENTITY,
  recurso_otro_proveedor: HttpStatus.UNPROCESSABLE_ENTITY,
  mes_fuera_de_ventana: HttpStatus.UNPROCESSABLE_ENTITY,
  consumo_duplicado: HttpStatus.UNPROCESSABLE_ENTITY,
  excede_horas_ofertadas: HttpStatus.UNPROCESSABLE_ENTITY,
};

@Catch()
export class FormateadorErrores implements ExceptionFilter {
  private readonly logger = new Logger(FormateadorErrores.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();

    const { status, body } = this.formatear(exception);
    response.status(status).json(body);
  }

  formatear(exception: unknown): {
    status: number;
    body: RespuestaErrorDominio;
  } {
    if (exception instanceof DomainError) {
      return {
        status: STATUS_POR_CODIGO[exception.code] ?? HttpStatus.BAD_REQUEST,
        body: {
          code: exception.code,
          message: exception.message,
          ...(exception.fields ? { fields: exception.fields } : {}),
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const original = exception.getResponse();
      const body = this.normalizarHttpException(status, original);
      return { status, body };
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
      exception instanceof Error ? exception.message : 'Excepción no Error',
    );
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: 'internal_error',
        message: 'Error interno del servidor',
      },
    };
  }

  private normalizarHttpException(
    status: number,
    original: string | object,
  ): RespuestaErrorDominio {
    const codigoPorDefecto = this.codigoPorStatus(status);
    if (typeof original === 'string') {
      return { code: codigoPorDefecto, message: original };
    }
    const obj = original as Record<string, unknown>;
    const code =
      typeof obj.code === 'string' ? (obj.code as string) : codigoPorDefecto;
    const message = this.extraerMensaje(obj) ?? 'Error';
    const fields =
      obj.fields && typeof obj.fields === 'object'
        ? (obj.fields as Record<string, unknown>)
        : undefined;
    return fields ? { code, message, fields } : { code, message };
  }

  private codigoPorStatus(status: number): string {
    if (status === HttpStatus.NOT_FOUND) return 'not_found';
    if (status === HttpStatus.CONFLICT) return 'conflict';
    if (status === HttpStatus.UNPROCESSABLE_ENTITY) return 'unprocessable';
    if (status === HttpStatus.FORBIDDEN) return 'forbidden';
    if (status === HttpStatus.UNAUTHORIZED) return 'unauthorized';
    if (status === HttpStatus.BAD_REQUEST) return 'bad_request';
    return 'http_error';
  }

  private extraerMensaje(obj: Record<string, unknown>): string | undefined {
    const m = obj.message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.join(', ');
    return undefined;
  }
}
