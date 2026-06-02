import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { randomUUID } from 'crypto';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation) private readonly repo: Repository<Reservation>,
  ) {}

  private generateConfirmationNumber(): string {
    return `SH-${Date.now().toString(36).toUpperCase()}-${randomUUID().split('-')[0].toUpperCase()}`;
  }

  async checkAvailability(roomId: string, checkInDate: string, checkOutDate: string, excludeId?: string): Promise<void> {
    const qb = this.repo.createQueryBuilder('r')
      .where('r.room_id = :roomId', { roomId })
      .andWhere('r.deleted_at IS NULL')
      .andWhere('r.status NOT IN (:...cancelled)', {
        cancelled: [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW],
      })
      .andWhere('r.check_in_date < :checkOut', { checkOut: checkOutDate })
      .andWhere('r.check_out_date > :checkIn', { checkIn: checkInDate });

    if (excludeId) qb.andWhere('r.id != :excludeId', { excludeId });

    const conflict = await qb.getOne();
    if (conflict) throw new ConflictException('Room not available for selected dates');
  }

  async create(tenantId: string, dto: CreateReservationDto): Promise<Reservation> {
    await this.checkAvailability(dto.roomId, dto.checkInDate, dto.checkOutDate);
    const reservation = this.repo.create({
      ...dto,
      tenantId,
      confirmationNumber: this.generateConfirmationNumber(),
    });
    return this.repo.save(reservation);
  }

  async findAll(tenantId: string): Promise<Reservation[]> {
    return this.repo.find({
      where: { tenantId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Reservation> {
    const r = await this.repo.findOne({ where: { id, tenantId, deletedAt: IsNull() } });
    if (!r) throw new NotFoundException('Reservation not found');
    return r;
  }

  async update(tenantId: string, id: string, dto: UpdateReservationDto): Promise<Reservation> {
    const reservation = await this.findOne(tenantId, id);

    if ((dto.checkInDate || dto.checkOutDate) && reservation.status !== ReservationStatus.CANCELLED) {
      await this.checkAvailability(
        reservation.roomId,
        dto.checkInDate ?? reservation.checkInDate,
        dto.checkOutDate ?? reservation.checkOutDate,
        id,
      );
    }

    if (dto.status === ReservationStatus.CANCELLED && !reservation.cancelledAt) {
      reservation.cancelledAt = new Date();
    }
    if (dto.status === ReservationStatus.CHECKED_IN && !reservation.actualCheckIn) {
      reservation.actualCheckIn = new Date();
    }
    if (dto.status === ReservationStatus.CHECKED_OUT && !reservation.actualCheckOut) {
      reservation.actualCheckOut = new Date();
    }

    Object.assign(reservation, dto);
    return this.repo.save(reservation);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(id);
  }
}
