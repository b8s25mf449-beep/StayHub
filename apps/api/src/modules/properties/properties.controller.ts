import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/services/auth.service';

@ApiTags('Properties')
@ApiBearerAuth()
@Controller('v1/properties')
export class PropertiesController {
  constructor(private readonly service: PropertiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create property' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePropertyDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List properties' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get property' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update property' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdatePropertyDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete property' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
