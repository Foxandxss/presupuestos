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

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  ActualizarEstimacionDto,
  CrearEstimacionDto,
  EstimacionPerfilDto,
} from './dto/estimacion.dto';
import {
  ActualizarProyectoDto,
  CrearProyectoDto,
  ProyectoDto,
} from './dto/proyecto.dto';
import { ProyectosService } from './proyectos.service';

@ApiTags('proyectos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('proyectos')
export class ProyectosController {
  constructor(private readonly service: ProyectosService) {}

  @Get()
  @ApiOkResponse({ type: [ProyectoDto] })
  list(): ProyectoDto[] {
    return this.service.list();
  }

  @Get(':id')
  @ApiOkResponse({ type: ProyectoDto })
  get(@Param('id', ParseIntPipe) id: number): ProyectoDto {
    return this.service.get(id);
  }

  @Post()
  @Roles('admin')
  @ApiCreatedResponse({ type: ProyectoDto })
  create(@Body() dto: CrearProyectoDto): ProyectoDto {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOkResponse({ type: ProyectoDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarProyectoDto,
  ): ProyectoDto {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  delete(@Param('id', ParseIntPipe) id: number): void {
    this.service.delete(id);
  }

  @Get(':id/estimaciones')
  @ApiOkResponse({ type: [EstimacionPerfilDto] })
  listEstimaciones(
    @Param('id', ParseIntPipe) id: number,
  ): EstimacionPerfilDto[] {
    return this.service.listEstimaciones(id);
  }

  @Post(':id/estimaciones')
  @Roles('admin')
  @ApiCreatedResponse({ type: EstimacionPerfilDto })
  addEstimacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CrearEstimacionDto,
  ): EstimacionPerfilDto {
    return this.service.addEstimacion(id, dto);
  }

  @Patch(':id/estimaciones/:estimacionId')
  @Roles('admin')
  @ApiOkResponse({ type: EstimacionPerfilDto })
  updateEstimacion(
    @Param('id', ParseIntPipe) id: number,
    @Param('estimacionId', ParseIntPipe) estimacionId: number,
    @Body() dto: ActualizarEstimacionDto,
  ): EstimacionPerfilDto {
    return this.service.updateEstimacion(id, estimacionId, dto);
  }

  @Delete(':id/estimaciones/:estimacionId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  deleteEstimacion(
    @Param('id', ParseIntPipe) id: number,
    @Param('estimacionId', ParseIntPipe) estimacionId: number,
  ): void {
    this.service.deleteEstimacion(id, estimacionId);
  }
}
