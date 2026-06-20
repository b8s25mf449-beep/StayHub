import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
  Headers, UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ChannelConnectionsService } from './channels.service';
import { CreateChannelConnectionDto } from './dto/create-channel-connection.dto';
import { UpdateChannelConnectionDto } from './dto/update-channel-connection.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtPayload } from '../auth/services/auth.service';

@ApiTags('Channels')
@ApiBearerAuth()
@Controller('v1/channels')
export class ChannelsController {
  constructor(private readonly service: ChannelConnectionsService) {}

  @Post()
  @ApiOperation({ summary: 'Connect a room to an OTA channel via iCal URL' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateChannelConnectionDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List channel connections (icalUrl excluded)' })
  @ApiQuery({ name: 'propertyId', required: false })
  @ApiQuery({ name: 'roomId', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('propertyId') propertyId?: string,
    @Query('roomId') roomId?: string,
  ) {
    return this.service.findAll(user.tenantId, propertyId, roomId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get channel connection detail (includes icalUrl)' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update channel connection URL or settings' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateChannelConnectionDto,
  ) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete channel connection' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }

  @Post('sync-all')
  @ApiOperation({ summary: 'Sync all channel connections for this tenant in parallel' })
  syncAll(@CurrentUser() user: JwtPayload) {
    return this.service.syncAll(user.tenantId);
  }

  @Public()
  @Post('cron-sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vercel cron: sync all iCal connections across all tenants' })
  cronSync(@Headers('authorization') auth: string) {
    const secret = process.env.CRON_SECRET;
    if (!secret || auth !== `Bearer ${secret}`) {
      throw new UnauthorizedException('Invalid cron secret');
    }
    return this.service.syncAllTenants();
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Preview iCal feed for a connection — dry run, no DB changes' })
  preview(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.previewConnection(user.tenantId, id);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Trigger manual iCal import — creates/updates reservations from OTA feed' })
  sync(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.sync(user.tenantId, id);
  }
}
