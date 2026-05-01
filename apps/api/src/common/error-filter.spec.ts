import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { DomainError } from '@operaciones/dominio';
import { TransicionIlegalError } from '../pedidos/maquina-estados-pedido';
import { ValidacionConsumoError } from '../consumos/validador-consumo';
import { FormateadorErrores } from './error-filter';

describe('FormateadorErrores', () => {
  const filtro = new FormateadorErrores();

  describe('DomainError', () => {
    it('TransicionIlegalError → 409 + code transicion_ilegal + fields', () => {
      const err = new TransicionIlegalError('Borrador', 'aprobar');
      const { status, body } = filtro.formatear(err);
      expect(status).toBe(HttpStatus.CONFLICT);
      expect(body).toEqual({
        code: 'transicion_ilegal',
        message: "No se puede 'aprobar' un pedido en estado 'Borrador'",
        fields: { estado: 'Borrador', accion: 'aprobar' },
      });
    });

    it('ValidacionConsumoError(pedido_no_activo) → 422', () => {
      const err = new ValidacionConsumoError(
        'pedido_no_activo',
        'No se puede registrar consumo en estado X',
      );
      const { status, body } = filtro.formatear(err);
      expect(status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(body).toEqual({
        code: 'pedido_no_activo',
        message: 'No se puede registrar consumo en estado X',
      });
    });

    it('ValidacionConsumoError(excede_horas_ofertadas) preserva fields.disponibles', () => {
      const err = new ValidacionConsumoError(
        'excede_horas_ofertadas',
        'Se exceden las ofertadas',
        { disponibles: 27 },
      );
      const { status, body } = filtro.formatear(err);
      expect(status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(body).toEqual({
        code: 'excede_horas_ofertadas',
        message: 'Se exceden las ofertadas',
        fields: { disponibles: 27 },
      });
    });

    it('DomainError(proyecto_con_pedidos) → 409', () => {
      const err = new DomainError(
        'proyecto_con_pedidos',
        'El proyecto tiene 3 pedidos asociados',
        { pedidosCount: 3 },
      );
      const { status, body } = filtro.formatear(err);
      expect(status).toBe(HttpStatus.CONFLICT);
      expect(body).toEqual({
        code: 'proyecto_con_pedidos',
        message: 'El proyecto tiene 3 pedidos asociados',
        fields: { pedidosCount: 3 },
      });
    });

    it('cubre los 5 motivos de ValidacionConsumoError (los 5 → 422)', () => {
      const motivos = [
        'pedido_no_activo',
        'recurso_otro_proveedor',
        'mes_fuera_de_ventana',
        'consumo_duplicado',
        'excede_horas_ofertadas',
      ] as const;
      for (const motivo of motivos) {
        const { status, body } = filtro.formatear(
          new ValidacionConsumoError(motivo, `mensaje ${motivo}`),
        );
        expect(status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(body.code).toBe(motivo);
      }
    });
  });

  describe('HttpException de Nest', () => {
    it('NotFoundException con string → 404 + code not_found', () => {
      const { status, body } = filtro.formatear(
        new NotFoundException('Pedido 42 no encontrado'),
      );
      expect(status).toBe(HttpStatus.NOT_FOUND);
      expect(body).toEqual({
        code: 'not_found',
        message: 'Pedido 42 no encontrado',
      });
    });

    it('ConflictException con string → 409 + code conflict', () => {
      const { status, body } = filtro.formatear(
        new ConflictException('No se puede aprobar un pedido sin líneas'),
      );
      expect(status).toBe(HttpStatus.CONFLICT);
      expect(body).toEqual({
        code: 'conflict',
        message: 'No se puede aprobar un pedido sin líneas',
      });
    });

    it('BadRequestException con array de mensajes (ValidationPipe) los une', () => {
      const { status, body } = filtro.formatear(
        new BadRequestException(['nombre debe ser string', 'edad debe ser number']),
      );
      expect(status).toBe(HttpStatus.BAD_REQUEST);
      expect(body.code).toBe('bad_request');
      expect(body.message).toBe('nombre debe ser string, edad debe ser number');
    });

    it('UnauthorizedException → 401 + code unauthorized', () => {
      const { status, body } = filtro.formatear(
        new UnauthorizedException('Token inválido'),
      );
      expect(status).toBe(HttpStatus.UNAUTHORIZED);
      expect(body.code).toBe('unauthorized');
    });

    it('ForbiddenException → 403 + code forbidden', () => {
      const { status, body } = filtro.formatear(
        new ForbiddenException('No tiene permisos'),
      );
      expect(status).toBe(HttpStatus.FORBIDDEN);
      expect(body.code).toBe('forbidden');
    });

    it('UnprocessableEntityException con objeto { code, message, fields }', () => {
      const { status, body } = filtro.formatear(
        new UnprocessableEntityException({
          code: 'consumo_duplicado',
          message: 'Duplicado',
          fields: { mes: 5 },
        }),
      );
      expect(status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(body).toEqual({
        code: 'consumo_duplicado',
        message: 'Duplicado',
        fields: { mes: 5 },
      });
    });
  });

  describe('Error genérico', () => {
    it('Error sin tipo → 500 + code internal_error', () => {
      const { status, body } = filtro.formatear(new Error('boom'));
      expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(body).toEqual({
        code: 'internal_error',
        message: 'Error interno del servidor',
      });
    });

    it('throw de un primitive (string) → 500', () => {
      const { status, body } = filtro.formatear('rotura cruda');
      expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(body.code).toBe('internal_error');
    });
  });
});
