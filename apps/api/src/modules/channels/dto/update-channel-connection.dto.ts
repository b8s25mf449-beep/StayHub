import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { ChannelStatus } from '../entities/channel-connection.entity';

export class UpdateChannelConnectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  icalUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channelPropertyId?: string;

  @ApiPropertyOptional({ enum: ChannelStatus })
  @IsOptional()
  @IsEnum(ChannelStatus)
  status?: ChannelStatus;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  settings?: Record<string, unknown>;
}
