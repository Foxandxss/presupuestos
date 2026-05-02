import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  ActualizarUsuarioDto,
  CrearUsuarioDto,
  ResetPasswordDto,
  SuspenderUsuarioDto,
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

  @Patch(':id')
  @ApiOkResponse({ type: UsuarioDto })
  @ApiOperation({ summary: 'Edita nombre y/o rol del usuario.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarUsuarioDto,
  ): UsuarioDto {
    return this.service.update(id, dto);
  }

  @Post(':id/reset-password')
  @ApiOkResponse({ type: UsuarioDto })
  @ApiOperation({
    summary:
      'Establece una nueva contraseña para el usuario. El admin la entrega por canal externo.',
  })
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
  ): UsuarioDto {
    return this.service.resetPassword(id, dto.nuevaPassword);
  }

  @Patch(':id/suspender')
  @ApiOkResponse({ type: UsuarioDto })
  @ApiOperation({
    summary:
      'Toggle del flag suspendido. El admin no puede suspenderse a sí mismo.',
  })
  suspender(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SuspenderUsuarioDto,
    @CurrentUser() user?: JwtPayload,
  ): UsuarioDto {
    return this.service.suspender(id, dto.suspendido, user?.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description:
      'Soft delete via eliminadoEn. El admin no puede eliminarse a sí mismo.',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: JwtPayload,
  ): void {
    this.service.remove(id, user?.sub);
  }
}
