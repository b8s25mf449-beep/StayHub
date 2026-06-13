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
        timeout: 15000,
        responseType: 'text',
        maxRedirects: 5,
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

    // ── Global dedup pass ─────────────────────────────────────────────────────
    // Runs BEFORE processing the feed. Handles two problems in one pass:
    // 1. Normalizes channelReservationId values stored with whitespace by old
    //    sync code — the root cause of "duplicate on every sync": TRIM mismatch
    //    caused the lookup to find nothing and always create a new record.
    // 2. Soft-deletes older duplicates for the same normalized UID+room,
    //    including stays dropped from Octorate's feed (today's arrivals,
    //    in-progress stays) that the per-UID loop below can never clean up.
    {
      const allRoomRes = await this.reservationRepo.find({
        where: {
          roomId:   connection.roomId,
          tenantId: connection.tenantId,
          deletedAt: IsNull(),
        },
        order: { createdAt: 'DESC' }, // newest first — we keep ids[0] per group
      });

      // First pass: normalize untrimmed UIDs so grouping is correct
      for (const r of allRoomRes) {
        if (!r.channelReservationId) continue;
        const trimmed = r.channelReservationId.trim();
        if (trimmed !== r.channelReservationId) {
          await this.reservationRepo.update(r.id, { channelReservationId: trimmed });
          r.channelReservationId = trimmed;
        }
      }

      // Second pass: group by normalized UID, keep newest, soft-delete the rest
      const uidGroups = new Map<string, string[]>(); // normalizedUid → [id, ...]
      for (const r of allRoomRes) {
        if (!r.channelReservationId) continue;
        const group = uidGroups.get(r.channelReservationId) ?? [];
        group.push(r.id);
        uidGroups.set(r.channelReservationId, group);
      }
      for (const [, ids] of uidGroups) {
        if (ids.length > 1) {
          for (const dupId of ids.slice(1)) {
            await this.reservationRepo.softDelete(dupId);
          }
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const result: SyncResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
    // feedUids = ALL UIDs present in the iCal (including past/skipped events).
    // Used for cleanup so we don't delete reservations that are still in the feed
    // but skipped due to the date filter (e.g. a guest who checked out yesterday).
    const feedUids = new Set<string>();
    // UTC "today" string for filtering past checkouts
    const today = new Date().toISOString().split('T')[0];

    for (const key of Object.keys(events)) {
      const component = events[key] as ical.VEvent;
      if (component.type !== 'VEVENT') continue;

      const rawUid = component.uid;
      const uid    = rawUid?.trim() ?? '';          // normalize once — used everywhere below
      const start  = component.start as Date | undefined;
      const end    = component.end as Date | undefined;

      // Always register the UID in the feed set so cleanup never deletes it
      if (uid) feedUids.add(uid);

      if (!uid || !start || !end) {
        result.skipped++;
        result.errors.push({ uid: uid || key, reason: 'Missing uid, dtstart, or dtend' });
        continue;
      }

      const checkInDate = this.toDateString(start);
      const checkOutDate = this.toDateString(end);

      // Skip reservations that already checked out before today (don't upsert, but UID stays in feedUids)
      if (checkOutDate < today) {
        result.skipped++;
        continue;
      }

      const rawSummary = component.summary as string | { val: string; params?: Record<string, string> } | undefined;
      const summaryStr = rawSummary && typeof rawSummary === 'object' ? rawSummary.val : (rawSummary ?? '');

      // Skip blocked dates (no guest) — still tracked in feedUids
      if (/^(CLOSED|BLOCKED|UNAVAILABLE|NO DISPONIBLE)/i.test(summaryStr.trim())) {
        result.skipped++;
        continue;
      }

      const parsed = this.parseSummary(summaryStr, connection.channel);
      const email = this.extractEmail(component);

      try {
        // Use TRIM() in SQL so we match records whose channelReservationId was
        // stored with surrounding whitespace by a previous buggy sync. The global
        // dedup pass above normalizes them going forward, but using TRIM here
        // ensures correctness even on the very first sync after the fix.
        const existingList = await this.reservationRepo
          .createQueryBuilder('r')
          .where('r.tenant_id = :tenantId', { tenantId: connection.tenantId })
          .andWhere('r.room_id = :roomId', { roomId: connection.roomId })
          .andWhere('TRIM(r.channel_reservation_id) = :uid', { uid })
          .andWhere('r.deleted_at IS NULL')
          .orderBy('r.created_at', 'DESC')
          .getMany();

        // Deduplicate: keep the most recently created, soft-delete the rest
        if (existingList.length > 1) {
          for (const dup of existingList.slice(1)) {
            await this.reservationRepo.softDelete(dup.id);
          }
        }

        const existing = existingList[0];

        if (existing) {
          let changed = false;
          // Normalize stored UID in case it was found via TRIM() match
          if (existing.channelReservationId !== uid) {
            existing.channelReservationId = uid;
            changed = true;
          }
          if (existing.checkInDate !== checkInDate || existing.checkOutDate !== checkOutDate) {
            existing.checkInDate = checkInDate;
            existing.checkOutDate = checkOutDate;
            changed = true;
          }
          if (parsed.totalAmount > 0 && Number(existing.totalAmount) !== parsed.totalAmount) {
            existing.totalAmount = parsed.totalAmount;
            existing.baseAmount  = parsed.totalAmount;
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

    // Full-sync cleanup: soft-delete FUTURE pending/confirmed iCal reservations whose UID is no
    // longer in the feed (OTA cancellation). Only touches reservations that haven't started yet
    // (checkInDate > today) so we never delete a guest who already arrived — Octorate drops
    // past events from the feed, but that doesn't mean the stay was cancelled.
    if (feedUids.size > 0) {
      const stale = await this.reservationRepo
        .createQueryBuilder('r')
        .where('r.tenant_id = :tenantId', { tenantId: connection.tenantId })
        .andWhere('r.room_id = :roomId', { roomId: connection.roomId })
        .andWhere('r.deleted_at IS NULL')
        .andWhere('r.channel_reservation_id IS NOT NULL')
        .andWhere('r.channel_reservation_id NOT IN (:...uids)', { uids: [...feedUids] })
        .andWhere('r.status IN (:...statuses)', { statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] })
        .andWhere('r.check_in_date > :today', { today })   // ← never touch past/current stays
        .getMany();

      for (const r of stale) {
        await this.reservationRepo.softDelete(r.id);
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
    // iCal all-day dates are midnight UTC — always extract the UTC date
    // to avoid timezone-shift bugs (e.g. UTC-6 would make June 13 → June 12)
    return d.toISOString().split('T')[0];
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
