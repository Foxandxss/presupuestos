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
  ActualizarRecursoDto,
  CrearRecursoDto,
  RecursoDto,
} from './dto/recurso.dto';
import { RecursosService } from './recursos.service';

@ApiTags('catálogo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('recursos')
export class RecursosController {
  constructor(private readonly service: RecursosService) {}

  @Get()
  @ApiOkResponse({ type: [RecursoDto] })
  list(): RecursoDto[] {
    return this.service.list();
  }

  @Get(':id')
  @ApiOkResponse({ type: RecursoDto })
  get(@Param('id', ParseIntPipe) id: number): RecursoDto {
    return this.service.get(id);
  }

  @Post()
  @Roles('admin')
  @ApiCreatedResponse({ type: RecursoDto })
  create(@Body() dto: CrearRecursoDto): RecursoDto {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOkResponse({ type: RecursoDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarRecursoDto,
  ): RecursoDto {
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
