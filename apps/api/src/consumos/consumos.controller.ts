import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
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
import { ConsumosService } from './consumos.service';
import {
  ConsumoDto,
  ConsumoFiltrosQuery,
  CrearConsumoDto,
} from './dto/consumo.dto';

@ApiTags('consumos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('consumos')
export class ConsumosController {
  constructor(private readonly service: ConsumosService) {}

  @Get()
  @ApiOkResponse({ type: [ConsumoDto] })
  list(@Query() filtros: ConsumoFiltrosQuery): ConsumoDto[] {
    return this.service.list(filtros);
  }

  @Get(':id')
  @ApiOkResponse({ type: ConsumoDto })
  get(@Param('id', ParseIntPipe) id: number): ConsumoDto {
    return this.service.get(id);
  }

  @Post()
  @ApiCreatedResponse({ type: ConsumoDto })
  create(@Body() dto: CrearConsumoDto): ConsumoDto {
    return this.service.create(dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  delete(@Param('id', ParseIntPipe) id: number): void {
    this.service.delete(id);
  }
}
