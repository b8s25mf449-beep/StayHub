import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, IsUrl } from 'class-validator';
import { ChannelType } from '../entities/channel-connection.entity';

export class CreateChannelConnectionDto {
  @ApiProperty({ description: 'Property UUID — must belong to current tenant' })
  @IsUUID()
  propertyId: string;

  @ApiProperty({ description: 'Room UUID — must belong to the property and tenant' })
  @IsUUID()
  roomId: string;

  @ApiProperty({ enum: ChannelType })
  @IsEnum(ChannelType)
  channel: ChannelType;

  @ApiProperty({ description: 'iCal feed URL provided by the OTA for this room' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: true })
  icalUrl: string;

  @ApiPropertyOptional({ description: 'Room or property ID as it appears in the OTA system' })
  @IsOptional()
  @IsString()
  channelPropertyId?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  settings?: Record<string, unknown>;
}
