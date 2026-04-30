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
  ActualizarServicioDto,
  CrearServicioDto,
  ServicioDto,
} from './dto/servicio.dto';
import { ServiciosService } from './servicios.service';

@ApiTags('catálogo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('servicios')
export class ServiciosController {
  constructor(private readonly service: ServiciosService) {}

  @Get()
  @ApiOkResponse({ type: [ServicioDto] })
  list(): ServicioDto[] {
    return this.service.list();
  }

  @Get(':id')
  @ApiOkResponse({ type: ServicioDto })
  get(@Param('id', ParseIntPipe) id: number): ServicioDto {
    return this.service.get(id);
  }

  @Post()
  @Roles('admin')
  @ApiCreatedResponse({ type: ServicioDto })
  create(@Body() dto: CrearServicioDto): ServicioDto {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOkResponse({ type: ServicioDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarServicioDto,
  ): ServicioDto {
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
