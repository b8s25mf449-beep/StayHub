import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomType } from '../entities/room-type.entity';
import { RoomTypesController } from './room-types.controller';
import { RoomTypesService } from './room-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([RoomType])],
  controllers: [RoomTypesController],
  providers: [RoomTypesService],
  exports: [RoomTypesService],
})
export class RoomTypesModule {}
