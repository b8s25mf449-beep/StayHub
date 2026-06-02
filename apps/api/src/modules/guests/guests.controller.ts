import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GuestsService } from './guests.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/services/auth.service';

@ApiTags('Guests')
@ApiBearerAuth()
@Controller('v1/guests')
export class GuestsController {
  constructor(private readonly service: GuestsService) {}

  @Post()
  @ApiOperation({ summary: 'Register guest' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateGuestDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List guests (optional search by name/email)' })
  @ApiQuery({ name: 'search', required: false })
  findAll(@CurrentUser() user: JwtPayload, @Query('search') search?: string) {
    return this.service.findAll(user.tenantId, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guest' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update guest' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateGuestDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete guest' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
