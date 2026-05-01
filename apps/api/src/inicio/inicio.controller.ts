import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import {
  ActividadEventoDto,
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
  @ApiOkResponse({ type: [ActividadEventoDto] })
  list(@Query() query: ActividadQuery): ActividadEventoDto[] {
    return this.service.actividad(query.limit ?? 10);
  }
}
