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
  ActualizarProveedorDto,
  CrearProveedorDto,
  ProveedorDto,
} from './dto/proveedor.dto';
import { ProveedoresService } from './proveedores.service';

@ApiTags('catálogo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly service: ProveedoresService) {}

  @Get()
  @ApiOkResponse({ type: [ProveedorDto] })
  list(): ProveedorDto[] {
    return this.service.list();
  }

  @Get(':id')
  @ApiOkResponse({ type: ProveedorDto })
  get(@Param('id', ParseIntPipe) id: number): ProveedorDto {
    return this.service.get(id);
  }

  @Post()
  @Roles('admin')
  @ApiCreatedResponse({ type: ProveedorDto })
  create(@Body() dto: CrearProveedorDto): ProveedorDto {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOkResponse({ type: ProveedorDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarProveedorDto,
  ): ProveedorDto {
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
