import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { RoomRate } from './entities/room-rate.entity';
import { Room } from '../properties/entities/room.entity';
import { RoomType } from '../properties/entities/room-type.entity';

export interface PriceBreakdown {
  date: string;
  pricePerNight: number;
  rateName: string;
}

export interface StayPrice {
  nights: number;
  baseAmount: number;
  currency: string;
  breakdown: PriceBreakdown[];
}

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(RoomRate) private readonly ratesRepo: Repository<RoomRate>,
    @InjectRepository(Room) private readonly roomsRepo: Repository<Room>,
    @InjectRepository(RoomType) private readonly roomTypesRepo: Repository<RoomType>,
  ) {}

  async findRatesForRoom(tenantId: string, roomId: string): Promise<RoomRate[]> {
    const room = await this.roomsRepo.findOne({
      where: { id: roomId, tenantId, deletedAt: IsNull() },
    });
    if (!room) throw new NotFoundException('Room not found');

    return this.ratesRepo
      .createQueryBuilder('r')
      .where('r.tenant_id = :tenantId', { tenantId })
      .andWhere('r.is_active = true')
      .andWhere('r.deleted_at IS NULL')
      .andWhere('(r.room_id = :roomId OR r.room_type_id = :roomTypeId)', {
        roomId,
        roomTypeId: room.roomTypeId,
      })
      .orderBy('r.priority', 'DESC')
      .addOrderBy('CASE WHEN r.room_id IS NOT NULL THEN 0 ELSE 1 END', 'ASC')
      .getMany();
  }

  async calculateStay(
    tenantId: string,
    roomId: string,
    checkIn: string,
    checkOut: string,
  ): Promise<StayPrice> {
    const room = await this.roomsRepo.findOne({
      where: { id: roomId, tenantId, deletedAt: IsNull() },
    });
    if (!room) throw new NotFoundException('Room not found');

    const roomType = await this.roomTypesRepo.findOne({
      where: { id: room.roomTypeId, tenantId, deletedAt: IsNull() },
    });
    if (!roomType) throw new NotFoundException('Room type not found');

    // Pass roomTypeId directly to avoid re-fetching room inside findRatesForRoom
    const rates = await this.ratesRepo
      .createQueryBuilder('r')
      .where('r.tenant_id = :tenantId', { tenantId })
      .andWhere('r.is_active = true')
      .andWhere('r.deleted_at IS NULL')
      .andWhere('(r.room_id = :roomId OR r.room_type_id = :roomTypeId)', {
        roomId,
        roomTypeId: room.roomTypeId,
      })
      .orderBy('r.priority', 'DESC')
      .addOrderBy('CASE WHEN r.room_id IS NOT NULL THEN 0 ELSE 1 END', 'ASC')
      .getMany();
    const nights = this.nightsBetween(checkIn, checkOut);

    if (nights <= 0) {
      return { nights: 0, baseAmount: 0, currency: roomType.currency ?? 'ARS', breakdown: [] };
    }

    const breakdown: PriceBreakdown[] = [];
    let baseAmount = 0;

    for (let i = 0; i < nights; i++) {
      const date = this.addDays(checkIn, i);
      const rate = this.findBestRate(rates, date, nights);
      const pricePerNight = rate ? Number(rate.pricePerNight) : Number(roomType.basePrice);
      breakdown.push({ date, pricePerNight, rateName: rate?.name ?? 'Precio base' });
      baseAmount += pricePerNight;
    }

    const currency = rates[0]?.currency ?? roomType.currency ?? 'ARS';
    return { nights, baseAmount: Math.round(baseAmount * 100) / 100, currency, breakdown };
  }

  private findBestRate(rates: RoomRate[], date: string, totalNights: number): RoomRate | null {
    for (const rate of rates) {
      const afterStart = !rate.startDate || rate.startDate <= date;
      const beforeEnd = !rate.endDate || rate.endDate >= date;
      const meetsMinNights = !rate.minNights || totalNights >= rate.minNights;
      if (afterStart && beforeEnd && meetsMinNights) return rate;
    }
    return null;
  }

  private nightsBetween(checkIn: string, checkOut: string): number {
    const msPerDay = 86_400_000;
    return Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / msPerDay,
    );
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
  }
}
