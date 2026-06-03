import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelConnection } from './entities/channel-connection.entity';
import { ChannelsController } from './channels.controller';
import { ChannelConnectionsService } from './channels.service';
import { ICalImportService } from './ical-import.service';
import { Guest } from '../guests/entities/guest.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Room } from '../properties/entities/room.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChannelConnection, Guest, Reservation, Room])],
  controllers: [ChannelsController],
  providers: [ChannelConnectionsService, ICalImportService],
  exports: [ChannelConnectionsService],
})
export class ChannelsModule {}
