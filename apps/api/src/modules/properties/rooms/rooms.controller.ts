import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/services/auth.service';

@ApiTags('Rooms')
@ApiBearerAuth()
@Controller('v1/rooms')
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  @Post()
  @ApiOperation({ summary: 'Create room' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRoomDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List rooms' })
  @ApiQuery({ name: 'propertyId', required: false })
  findAll(@CurrentUser() user: JwtPayload, @Query('propertyId') propertyId?: string) {
    return this.service.findAll(user.tenantId, propertyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update room' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete room' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
