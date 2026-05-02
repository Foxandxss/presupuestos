import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CrearUsuarioDto,
  UsuarioDto,
  UsuariosPaginaDto,
  UsuariosQuery,
} from './dto/usuario.dto';
import { UsuariosService } from './usuarios.service';

@ApiTags('usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get()
  @ApiOkResponse({ type: UsuariosPaginaDto })
  @ApiOperation({
    summary:
      'Lista paginada de usuarios. Filtros opcionales: q (substring email/nombre), rol, incluirEliminados.',
  })
  list(@Query() query: UsuariosQuery): UsuariosPaginaDto {
    return this.service.list({
      limit: query.limit ?? 25,
      offset: query.offset ?? 0,
      q: query.q,
      rol: query.rol,
      incluirEliminados: query.incluirEliminados,
    });
  }

  @Post()
  @ApiCreatedResponse({ type: UsuarioDto })
  create(@Body() dto: CrearUsuarioDto): UsuarioDto {
    return this.service.create(dto);
  }
}
