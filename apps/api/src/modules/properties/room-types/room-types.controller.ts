import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RoomTypesService } from './room-types.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/services/auth.service';

@ApiTags('Room Types')
@ApiBearerAuth()
@Controller('v1/room-types')
export class RoomTypesController {
  constructor(private readonly service: RoomTypesService) {}

  @Post()
  @ApiOperation({ summary: 'Create room type' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRoomTypeDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List room types' })
  @ApiQuery({ name: 'propertyId', required: false })
  findAll(@CurrentUser() user: JwtPayload, @Query('propertyId') propertyId?: string) {
    return this.service.findAll(user.tenantId, propertyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room type' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update room type' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateRoomTypeDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete room type' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
