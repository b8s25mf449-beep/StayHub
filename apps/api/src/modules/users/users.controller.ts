import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/services/auth.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('v1/users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create user in current tenant' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List users in current tenant' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete user' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
