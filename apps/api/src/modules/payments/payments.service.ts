import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly repo: Repository<Payment>,
  ) {}

  async create(tenantId: string, dto: CreatePaymentDto): Promise<Payment> {
    const payment = this.repo.create({ ...dto, tenantId });
    return this.repo.save(payment);
  }

  async findAll(tenantId: string, reservationId?: string): Promise<Payment[]> {
    const where: any = { tenantId, deletedAt: IsNull() };
    if (reservationId) where.reservationId = reservationId;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(tenantId: string, id: string): Promise<Payment> {
    const payment = await this.repo.findOne({ where: { id, tenantId, deletedAt: IsNull() } });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async update(tenantId: string, id: string, dto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.findOne(tenantId, id);
    if (dto.status === PaymentStatus.COMPLETED && !payment.paidAt) {
      payment.paidAt = new Date();
    }
    Object.assign(payment, dto);
    return this.repo.save(payment);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(id);
  }
}
