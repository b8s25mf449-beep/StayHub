import { PartialType } from '@nestjs/mapped-types';
import { CreateRoomRateDto } from './create-room-rate.dto';

export class UpdateRoomRateDto extends PartialType(CreateRoomRateDto) {}
