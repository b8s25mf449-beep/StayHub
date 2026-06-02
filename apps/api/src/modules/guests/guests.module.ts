import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guest } from './entities/guest.entity';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';

@Module({
  imports: [TypeOrmModule.forFeature([Guest])],
  controllers: [GuestsController],
  providers: [GuestsService],
  exports: [GuestsService],
})
export class GuestsModule {}
