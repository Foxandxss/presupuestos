import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { toCsv } from './csv';
import {
  FilaReporteFacturacionDto,
  FilaReporteHorasDto,
  FilaReportePedidoDto,
  ReporteFacturacionQuery,
  ReporteHorasQuery,
  ReportePedidosQuery,
} from './dto/reportes.dto';
import { ReportesService } from './reportes.service';

@ApiTags('reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('reportes')
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  @Get('pedidos')
  @ApiOkResponse({ type: [FilaReportePedidoDto] })
  @ApiQuery({ name: 'formato', required: false, enum: ['json', 'csv'] })
  pedidos(
    @Query() query: ReportePedidosQuery,
    @Res({ passthrough: true }) res: Response,
  ): FilaReportePedidoDto[] | string {
    const filas = this.service.pedidos(query);
    if (query.formato === 'csv') {
      const csv = toCsv(
        [
          'id',
          'proyectoId',
          'proyecto',
          'proveedorId',
          'proveedor',
          'estado',
          'fechaSolicitud',
          'fechaAprobacion',
          'totalLineas',
          'totalHorasOfertadas',
          'totalHorasConsumidas',
          'importeTotal',
        ],
        filas.map((f) => [
          f.id,
          f.proyectoId,
          f.proyectoNombre,
          f.proveedorId,
          f.proveedorNombre,
          f.estado,
          f.fechaSolicitud,
          f.fechaAprobacion,
          f.totalLineas,
          f.totalHorasOfertadas,
          f.totalHorasConsumidas,
          f.importeTotal,
        ]),
      );
      setCsvHeaders(res, 'reporte-pedidos.csv');
      return csv;
    }
    return filas;
  }

  @Get('horas')
  @ApiOkResponse({ type: [FilaReporteHorasDto] })
  @ApiQuery({ name: 'formato', required: false, enum: ['json', 'csv'] })
  horas(
    @Query() query: ReporteHorasQuery,
    @Res({ passthrough: true }) res: Response,
  ): FilaReporteHorasDto[] | string {
    const filas = this.service.horas(query);
    if (query.formato === 'csv') {
      const csv = toCsv(
        [
          'proyectoId',
          'proyecto',
          'perfilTecnicoId',
          'perfilTecnico',
          'proveedorId',
          'proveedor',
          'horasEstimadas',
          'horasOfertadas',
          'horasConsumidas',
          'horasPendientes',
        ],
        filas.map((f) => [
          f.proyectoId,
          f.proyectoNombre,
          f.perfilTecnicoId,
          f.perfilTecnicoNombre,
          f.proveedorId,
          f.proveedorNombre,
          f.horasEstimadas,
          f.horasOfertadas,
          f.horasConsumidas,
          f.horasPendientes,
        ]),
      );
      setCsvHeaders(res, 'reporte-horas.csv');
      return csv;
    }
    return filas;
  }

  @Get('facturacion')
  @ApiOkResponse({ type: [FilaReporteFacturacionDto] })
  @ApiQuery({ name: 'formato', required: false, enum: ['json', 'csv'] })
  facturacion(
    @Query() query: ReporteFacturacionQuery,
    @Res({ passthrough: true }) res: Response,
  ): FilaReporteFacturacionDto[] | string {
    const filas = this.service.facturacion(query);
    if (query.formato === 'csv') {
      const csv = toCsv(
        ['anio', 'mes', 'proveedorId', 'proveedor', 'totalEur'],
        filas.map((f) => [
          f.anio,
          f.mes,
          f.proveedorId,
          f.proveedorNombre,
          f.totalEur,
        ]),
      );
      setCsvHeaders(res, nombreFicheroFacturacion(query));
      return csv;
    }
    return filas;
  }
}

function setCsvHeaders(res: Response, filename: string): void {
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
}

function nombreFicheroFacturacion(query: ReporteFacturacionQuery): string {
  if (query.anio !== undefined) {
    return `facturacion-${query.anio}.csv`;
  }
  if (query.anioDesde !== undefined && query.mesDesde !== undefined) {
    return `facturacion-${query.anioDesde}-${pad(query.mesDesde)}.csv`;
  }
  return 'facturacion.csv';
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
