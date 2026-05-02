import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { toCsv } from '../reportes/csv';
import {
  ActividadPaginaDto,
  ActividadQuery,
  InicioKpisQuery,
  KpisAdminDto,
  KpisConsultorDto,
} from './dto/inicio.dto';
import { InicioService } from './inicio.service';

@ApiTags('inicio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inicio')
export class InicioController {
  constructor(private readonly service: InicioService) {}

  @Get('kpis')
  @ApiOkResponse({ description: 'KPIs admin o consultor según el query rol' })
  @ApiOperation({
    summary:
      'Devuelve KPIs admin (rol=admin) o consultor (rol=consultor). El consultor sólo puede pedir su propio rol.',
  })
  kpis(
    @Query() query: InicioKpisQuery,
    @CurrentUser() user: JwtPayload,
  ): KpisAdminDto | KpisConsultorDto {
    if (query.rol === 'admin') {
      if (user.rol !== 'admin') {
        throw new BadRequestException('Sólo admins pueden pedir KPIs admin');
      }
      return this.service.kpisAdmin();
    }
    return this.service.kpisConsultor(user.sub);
  }
}

@ApiTags('inicio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('actividad')
export class ActividadController {
  constructor(private readonly service: InicioService) {}

  @Get()
  @ApiOkResponse({ type: ActividadPaginaDto })
  @ApiOperation({
    summary:
      'Feed paginado de actividad. Filtros opcionales acumulables (tipo, desde, hasta, q, usuarioId, pedidoId, proyectoId). Con formato=csv devuelve un dump sin paginar.',
  })
  @ApiQuery({ name: 'formato', required: false, enum: ['json', 'csv'] })
  list(
    @Query() query: ActividadQuery,
    @Res({ passthrough: true }) res: Response,
  ): ActividadPaginaDto | string {
    const filtros = {
      tipo: query.tipo,
      desde: query.desde,
      hasta: query.hasta,
      q: query.q,
      usuarioId: query.usuarioId,
      pedidoId: query.pedidoId,
      proyectoId: query.proyectoId,
    };

    if (query.formato === 'csv') {
      // CSV exporta todos los eventos que cumplen los filtros, sin paginar
      // (limit alto). El admin esperará el dump completo en lugar de un
      // recorte por página.
      const pagina = this.service.actividad({
        ...filtros,
        limit: 100000,
        offset: 0,
      });
      const csv = toCsv(
        ['fecha', 'tipo', 'accion', 'descripcion', 'recursoTipo', 'recursoId', 'usuarioId', 'usuarioEmail'],
        pagina.items.map((e) => [
          e.fecha,
          e.tipo,
          e.accion,
          e.descripcion,
          e.recurso.tipo,
          e.recurso.id,
          e.usuarioId,
          e.usuarioEmail,
        ]),
      );
      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="actividad.csv"',
      });
      return csv;
    }

    return this.service.actividad({
      ...filtros,
      limit: query.limit ?? 10,
      offset: query.offset ?? 0,
    });
  }
}
