import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ChangeRoleDto {
  @ApiProperty()
  @IsUUID('4')
  roleId: string;
}
