import { Injectable, BadGatewayException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import axios from 'axios';
import * as ical from 'node-ical';
import { randomUUID } from 'crypto';
import { ChannelConnection, ChannelStatus, ChannelType } from './entities/channel-connection.entity';
import { Guest, GuestStatus } from '../guests/entities/guest.entity';
import { Reservation, ReservationSource, ReservationStatus } from '../reservations/entities/reservation.entity';

export interface SyncResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ uid: string; reason: string }>;
}

@Injectable()
export class ICalImportService {
  constructor(
    @InjectRepository(ChannelConnection)
    private readonly connRepo: Repository<ChannelConnection>,
    @InjectRepository(Guest)
    private readonly guestRepo: Repository<Guest>,
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
  ) {}

  async importFromConnection(connection: ChannelConnection): Promise<SyncResult> {
    connection.status = ChannelStatus.SYNCING;
    connection.lastError = null;
    await this.connRepo.save(connection);

    let icsString: string;
    try {
      const response = await axios.get<string>(connection.icalUrl, {
        timeout: 10000,
        responseType: 'text',
        maxRedirects: 0,
      });
      icsString = response.data;
    } catch (err: any) {
      const msg = err.code === 'ECONNABORTED' ? 'Fetch timeout' : `HTTP error: ${err.message}`;
      connection.status = ChannelStatus.ERROR;
      connection.lastError = msg;
      await this.connRepo.save(connection);
      throw new BadGatewayException(msg);
    }

    let events: ical.CalendarResponse;
    try {
      events = ical.parseICS(icsString);
    } catch (err: any) {
      const msg = `Parse error: ${err.message}`;
      connection.status = ChannelStatus.ERROR;
      connection.lastError = msg;
      await this.connRepo.save(connection);
      throw new UnprocessableEntityException(msg);
    }

    const result: SyncResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

    for (const key of Object.keys(events)) {
      const component = events[key] as ical.VEvent;
      if (component.type !== 'VEVENT') continue;

      const uid = component.uid;
      const start = component.start as Date | undefined;
      const end = component.end as Date | undefined;

      if (!uid || !start || !end) {
        result.skipped++;
        result.errors.push({ uid: uid ?? key, reason: 'Missing uid, dtstart, or dtend' });
        continue;
      }

      const checkInDate = this.toDateString(start);
      const checkOutDate = this.toDateString(end);

      // Skip reservations that already checked out before today
      const today = this.toDateString(new Date());
      if (checkOutDate < today) {
        result.skipped++;
        continue;
      }

      const rawSummary = component.summary as string | { val: string; params?: Record<string, string> } | undefined;
      const summaryStr = rawSummary && typeof rawSummary === 'object' ? rawSummary.val : (rawSummary ?? '');

      // Skip blocked dates (no guest)
      if (/^(CLOSED|BLOCKED|UNAVAILABLE|NO DISPONIBLE)/i.test(summaryStr.trim())) {
        result.skipped++;
        continue;
      }

      const parsed = this.parseSummary(summaryStr, connection.channel);
      const email = this.extractEmail(component);

      try {
        const existing = await this.reservationRepo.findOne({
          where: {
            channelReservationId: uid,
            tenantId: connection.tenantId,
            deletedAt: IsNull(),
          },
        });

        if (existing) {
          let changed = false;
          if (existing.checkInDate !== checkInDate || existing.checkOutDate !== checkOutDate) {
            existing.checkInDate = checkInDate;
            existing.checkOutDate = checkOutDate;
            changed = true;
          }
          if (parsed.totalAmount > 0 && existing.totalAmount !== parsed.totalAmount) {
            existing.totalAmount = parsed.totalAmount;
            existing.baseAmount = parsed.totalAmount;
            changed = true;
          }
          if (changed) {
            await this.reservationRepo.save(existing);
            result.updated++;
          } else {
            result.skipped++;
          }
        } else {
          const guest = this.guestRepo.create({
            tenantId: connection.tenantId,
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            ...(email ? { email } : {}),
            status: GuestStatus.ACTIVE,
            notes: `Auto-importado vía iCal. UID: ${uid}`,
          });
          const savedGuest = await this.guestRepo.save(guest);

          try {
            const reservation = this.reservationRepo.create({
              tenantId: connection.tenantId,
              propertyId: connection.propertyId,
              roomId: connection.roomId,
              guestId: savedGuest.id,
              confirmationNumber: this.generateConfirmationNumber(),
              channelReservationId: uid,
              source: this.toReservationSource(connection.channel),
              status: ReservationStatus.CONFIRMED,
              checkInDate,
              checkOutDate,
              baseAmount: parsed.totalAmount,
              totalAmount: parsed.totalAmount,
              adultsCount: 1,
            });
            await this.reservationRepo.save(reservation);
            result.imported++;
          } catch (reservationErr: any) {
            await this.guestRepo.softDelete(savedGuest.id);
            throw reservationErr;
          }
        }
      } catch (err: any) {
        result.errors.push({ uid, reason: err.message });
      }
    }

    connection.status = ChannelStatus.ACTIVE;
    connection.lastSyncAt = new Date();
    connection.lastSyncCount = result.imported + result.updated;
    connection.lastError = null;
    await this.connRepo.save(connection);

    return result;
  }

  private toDateString(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Parses Octorate SUMMARY format:
   * "Client Name (Sanchez Reyes) Total (2553.47) Period (13/06/2026 to 16/06/2026)"
   * Also handles plain name strings from other channels.
   */
  private parseSummary(
    summary: string,
    channel: ChannelType,
  ): { firstName: string; lastName: string; totalAmount: number } {
    // Octorate format: Client Name (...) Total (...) Period (...)
    const nameMatch = summary.match(/Client\s+Name\s*\(([^)]+)\)/i);
    const totalMatch = summary.match(/Total\s*\(([0-9]+(?:\.[0-9]{1,2})?)\)/i);

    const totalAmount = totalMatch ? parseFloat(totalMatch[1]) : 0;

    if (nameMatch) {
      const fullName = nameMatch[1].trim();
      const parts = fullName.split(/\s+/);
      // Octorate puts last name first: "Sanchez Reyes" or "Rivera Betancourt Tania L"
      if (parts.length >= 2) {
        const firstName = parts[parts.length - 1];
        const lastName = parts.slice(0, -1).join(' ');
        return { firstName, lastName, totalAmount };
      }
      return { firstName: fullName, lastName: this.channelLabel(channel), totalAmount };
    }

    // Fallback: plain name string
    const parts = summary.trim().split(/\s+/);
    if (parts.length >= 2) return { firstName: parts[0], lastName: parts.slice(1).join(' '), totalAmount };
    if (parts[0]) return { firstName: parts[0], lastName: this.channelLabel(channel), totalAmount };
    return { firstName: 'OTA', lastName: this.channelLabel(channel), totalAmount };
  }

  /** Extract email from ATTENDEE or ORGANIZER MAILTO fields */
  private extractEmail(component: ical.VEvent): string | null {
    const attendee = (component as any).attendee;
    if (!attendee) return null;
    const raw = typeof attendee === 'string' ? attendee : attendee?.val ?? '';
    const match = raw.match(/mailto:([^\s;>]+)/i);
    return match ? match[1].toLowerCase() : null;
  }

  private channelLabel(channel: ChannelType): string {
    const labels: Record<ChannelType, string> = {
      [ChannelType.BOOKING_COM]: 'Booking.com',
      [ChannelType.AIRBNB]: 'Airbnb',
      [ChannelType.EXPEDIA]: 'Expedia',
      [ChannelType.ICAL]: 'iCal',
      [ChannelType.VRBO]: 'VRBO',
    };
    return labels[channel];
  }

  private toReservationSource(channel: ChannelType): ReservationSource {
    const map: Partial<Record<ChannelType, ReservationSource>> = {
      [ChannelType.BOOKING_COM]: ReservationSource.BOOKING_COM,
      [ChannelType.AIRBNB]: ReservationSource.AIRBNB,
      [ChannelType.EXPEDIA]: ReservationSource.EXPEDIA,
      [ChannelType.ICAL]: ReservationSource.ICAL,
      [ChannelType.VRBO]: ReservationSource.ICAL,
    };
    return map[channel] ?? ReservationSource.ICAL;
  }

  private generateConfirmationNumber(): string {
    return `SH-${Date.now().toString(36).toUpperCase()}-${randomUUID().split('-')[0].toUpperCase()}`;
  }
}
