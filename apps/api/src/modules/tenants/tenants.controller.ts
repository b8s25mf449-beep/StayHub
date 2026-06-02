import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('v1/tenants')
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  create(@Body() dto: CreateTenantDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all tenants' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update tenant' })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete tenant' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
