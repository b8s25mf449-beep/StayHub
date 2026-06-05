import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserStatus } from '../entities/user.entity';

export class ChangeStatusDto {
  @ApiProperty({ enum: ['active', 'suspended'] })
  @IsEnum(['active', 'suspended'])
  status: UserStatus.ACTIVE | UserStatus.SUSPENDED;
}
