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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import {
  ActualizarPerfilTecnicoDto,
  CrearPerfilTecnicoDto,
  PerfilTecnicoDto,
} from './dto/perfil-tecnico.dto';
import { PerfilesTecnicosService } from './perfiles-tecnicos.service';

@ApiTags('catálogo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('perfiles-tecnicos')
export class PerfilesTecnicosController {
  constructor(private readonly service: PerfilesTecnicosService) {}

  @Get()
  @ApiOkResponse({ type: [PerfilTecnicoDto] })
  list(): PerfilTecnicoDto[] {
    return this.service.list();
  }

  @Get(':id')
  @ApiOkResponse({ type: PerfilTecnicoDto })
  get(@Param('id', ParseIntPipe) id: number): PerfilTecnicoDto {
    return this.service.get(id);
  }

  @Post()
  @Roles('admin')
  @ApiCreatedResponse({ type: PerfilTecnicoDto })
  create(@Body() dto: CrearPerfilTecnicoDto): PerfilTecnicoDto {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOkResponse({ type: PerfilTecnicoDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarPerfilTecnicoDto,
  ): PerfilTecnicoDto {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  delete(@Param('id', ParseIntPipe) id: number): void {
    this.service.delete(id);
  }
}
