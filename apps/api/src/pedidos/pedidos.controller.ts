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
  ActualizarLineaPedidoDto,
  CrearLineaPedidoDto,
  LineaPedidoDto,
} from './dto/linea-pedido.dto';
import {
  ActualizarPedidoDto,
  CrearPedidoDto,
  PedidoDto,
  TransicionPedidoDto,
} from './dto/pedido.dto';
import { PedidosService } from './pedidos.service';

@ApiTags('pedidos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pedidos')
export class PedidosController {
  constructor(private readonly service: PedidosService) {}

  @Get()
  @ApiOkResponse({ type: [PedidoDto] })
  list(): PedidoDto[] {
    return this.service.list();
  }

  @Get(':id')
  @ApiOkResponse({ type: PedidoDto })
  get(@Param('id', ParseIntPipe) id: number): PedidoDto {
    return this.service.get(id);
  }

  @Post()
  @Roles('admin')
  @ApiCreatedResponse({ type: PedidoDto })
  create(@Body() dto: CrearPedidoDto): PedidoDto {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOkResponse({ type: PedidoDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarPedidoDto,
  ): PedidoDto {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  delete(@Param('id', ParseIntPipe) id: number): void {
    this.service.delete(id);
  }

  @Post(':id/transicion')
  @Roles('admin')
  @ApiOkResponse({ type: PedidoDto })
  transitar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransicionPedidoDto,
  ): PedidoDto {
    return this.service.transitar(id, dto.accion);
  }

  @Get(':id/lineas')
  @ApiOkResponse({ type: [LineaPedidoDto] })
  listLineas(
    @Param('id', ParseIntPipe) id: number,
  ): LineaPedidoDto[] {
    return this.service.listLineas(id);
  }

  @Post(':id/lineas')
  @Roles('admin')
  @ApiCreatedResponse({ type: LineaPedidoDto })
  addLinea(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CrearLineaPedidoDto,
  ): LineaPedidoDto {
    return this.service.addLinea(id, dto);
  }

  @Patch(':id/lineas/:lineaId')
  @Roles('admin')
  @ApiOkResponse({ type: LineaPedidoDto })
  updateLinea(
    @Param('id', ParseIntPipe) id: number,
    @Param('lineaId', ParseIntPipe) lineaId: number,
    @Body() dto: ActualizarLineaPedidoDto,
  ): LineaPedidoDto {
    return this.service.updateLinea(id, lineaId, dto);
  }

  @Delete(':id/lineas/:lineaId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  deleteLinea(
    @Param('id', ParseIntPipe) id: number,
    @Param('lineaId', ParseIntPipe) lineaId: number,
  ): void {
    this.service.deleteLinea(id, lineaId);
  }
}
