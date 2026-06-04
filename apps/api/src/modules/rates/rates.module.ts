import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomRate } from './entities/room-rate.entity';
import { RoomType } from '../properties/entities/room-type.entity';
import { Room } from '../properties/entities/room.entity';
import { PricingService } from './pricing.service';
import { RatesController } from './rates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RoomRate, Room, RoomType])],
  controllers: [RatesController],
  providers: [PricingService],
  exports: [PricingService],
})
export class RatesModule {}
