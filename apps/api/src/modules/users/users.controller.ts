import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/services/auth.service';
import { RoleGuard } from '../../common/guards/role.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('v1/users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post()
  @UseGuards(RoleGuard)
  @RequireRole('super_admin')
  @ApiOperation({ summary: 'Create user in current tenant (super_admin only)' })
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
  @UseGuards(RoleGuard)
  @RequireRole('super_admin')
  @ApiOperation({ summary: 'Update user (super_admin only)' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Patch(':id/role')
  @UseGuards(RoleGuard)
  @RequireRole('super_admin')
  @ApiOperation({ summary: 'Change user role (super_admin only)' })
  changeRole(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.service.changeRole(user.tenantId, id, dto.roleId, user.sub);
  }

  @Patch(':id/status')
  @UseGuards(RoleGuard)
  @RequireRole('super_admin')
  @ApiOperation({ summary: 'Suspend or reactivate user (super_admin only)' })
  changeStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.service.changeStatus(user.tenantId, id, dto.status, user.sub);
  }

  @Delete(':id')
  @UseGuards(RoleGuard)
  @RequireRole('super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete user (super_admin only)' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.tenantId, id);
  }
}
