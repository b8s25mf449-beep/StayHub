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
      const uid    = rawUid?.trim() ?? '';
      const start  = component.start as Date | undefined;
      const end    = component.end as Date | undefined;

      // Always register the UID before any skip so stale cleanup never wrongly deletes it
      if (uid) feedUids.add(uid);

      if (!uid || !start || !end) {
        result.skipped++;
        result.errors.push({ uid: uid || key, reason: 'Missing uid, dtstart, or dtend' });
        continue;
      }

      const checkInDate  = this.toDateString(start);
      const checkOutDate = this.toDateString(end);

      // Handle STATUS:CANCELLED — Octorate marks cancelled bookings this way instead of
      // removing the VEVENT from the feed. Soft-delete the matching DB record if found.
      const eventStatus = ((component as any).status ?? '').toString().toUpperCase();
      if (eventStatus === 'CANCELLED') {
        const cancelledList = await this.reservationRepo
          .createQueryBuilder('r')
          .where('r.tenant_id = :tenantId', { tenantId: connection.tenantId })
          .andWhere('r.room_id = :roomId', { roomId: connection.roomId })
          .andWhere('TRIM(r.channel_reservation_id) = :uid', { uid })
          .andWhere('r.deleted_at IS NULL')
          .getMany();
        for (const r of cancelledList) {
          await this.reservationRepo.softDelete(r.id);
        }
        result.skipped++;
        continue;
      }

      // Skip reservations that already checked out before today (UID stays in feedUids)
      if (checkOutDate < today) {
        result.skipped++;
        continue;
      }

      const rawSummary = component.summary as string | { val: string; params?: Record<string, string> } | undefined;
      const summaryStr = rawSummary && typeof rawSummary === 'object' ? rawSummary.val : (rawSummary ?? '');

      // Blocked / maintenance events: if they cover today or the future, auto-create a
      // placeholder reservation so the room shows as occupied without manual intervention.
      // This handles Octorate removing in-progress guest details and replacing them with
      // a generic BLOCKED marker once the guest is in-house.
      if (/^(CLOSED|BLOCKED|UNAVAILABLE|NO DISPONIBLE|BLOQUEADO|MANTENIMIENTO|NOT AVAILABLE)/i.test(summaryStr.trim())) {
        const coversToday = checkInDate <= today && checkOutDate > today;
        if (coversToday) {
          // Only create if no active reservation already covers this room+dates
          const overlap = await this.reservationRepo
            .createQueryBuilder('r')
            .where('r.tenant_id = :tenantId', { tenantId: connection.tenantId })
            .andWhere('r.room_id = :roomId', { roomId: connection.roomId })
            .andWhere('r.deleted_at IS NULL')
            .andWhere('r.check_in_date <= :today AND r.check_out_date > :today', { today })
            .getOne();

          if (!overlap) {
            try {
              const guest = this.guestRepo.create({
                tenantId: connection.tenantId,
                firstName: 'Huésped',
                lastName: 'Octorate',
                status: GuestStatus.ACTIVE,
                notes: `Auto-importado desde bloqueo iCal. UID: ${uid}`,
              });
              const savedGuest = await this.guestRepo.save(guest);
              const placeholder = this.reservationRepo.create({
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
                baseAmount: 0,
                totalAmount: 0,
                adultsCount: 1,
                notes: `Importado automáticamente desde bloqueo de Octorate (${summaryStr}). Editá los datos del huésped.`,
              });
              await this.reservationRepo.save(placeholder);
              result.imported++;
            } catch (err: any) {
              result.errors.push({ uid, reason: `Blocked auto-import: ${err.message}` });
            }
          } else {
            result.skipped++;
          }
        } else {
          result.skipped++;
        }
        continue;
      }

      const parsed = this.parseSummary(summaryStr, connection.channel);
      const email = this.extractEmail(component);

      try {
        // Search including soft-deleted so we can restore them if the UID is back in the feed.
        // This handles the case where stale cleanup removed the record but the OTA brought it back.
        const allMatchingList = await this.reservationRepo
          .createQueryBuilder('r')
          .where('r.tenant_id = :tenantId', { tenantId: connection.tenantId })
          .andWhere('r.room_id = :roomId', { roomId: connection.roomId })
          .andWhere('TRIM(r.channel_reservation_id) = :uid', { uid })
          .withDeleted()
          .orderBy('r.deleted_at', 'ASC', 'NULLS FIRST') // active records first
          .addOrderBy('r.created_at', 'DESC')
          .getMany();

        // Restore any soft-deleted matches back to active
        for (const r of allMatchingList.filter((r) => r.deletedAt)) {
          await this.reservationRepo.restore(r.id);
          r.deletedAt = null as any;
        }

        const activeList = allMatchingList.filter((r) => !r.deletedAt);

        // Deduplicate: keep the most recently created, soft-delete the rest
        if (activeList.length > 1) {
          for (const dup of activeList.slice(1)) {
            await this.reservationRepo.softDelete(dup.id);
          }
        }

        const existing = activeList[0];

        if (existing) {
          let changed = false;
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
      // Double protection: only delete if BOTH check_in is in the future AND check_out is
      // after tomorrow. This ensures we never touch a guest who is currently in-house even
      // if Octorate drops their UID from the feed mid-stay.
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const stale = await this.reservationRepo
        .createQueryBuilder('r')
        .where('r.tenant_id = :tenantId', { tenantId: connection.tenantId })
        .andWhere('r.room_id = :roomId', { roomId: connection.roomId })
        .andWhere('r.deleted_at IS NULL')
        .andWhere('r.channel_reservation_id IS NOT NULL')
        .andWhere('r.channel_reservation_id NOT IN (:...uids)', { uids: [...feedUids] })
        .andWhere('r.status IN (:...statuses)', { statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] })
        .andWhere('r.check_in_date > :today', { today })        // not yet started
        .andWhere('r.check_out_date > :tomorrowStr', { tomorrowStr }) // extra buffer: checking out 2+ days from now
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

  async previewConnection(connection: ChannelConnection): Promise<{
    feedUrl: string;
    today: string;
    fetchStatus: 'ok' | 'error';
    fetchError?: string;
    events: Array<{
      uid: string;
      summary: string;
      checkIn: string;
      checkOut: string;
      action: 'import' | 'update' | 'skip_past' | 'skip_blocked' | 'skip_missing_fields' | 'in_db';
      reason: string;
      existsInDb: boolean;
    }>;
    dbReservations: Array<{
      id: string;
      channelReservationId: string | null;
      checkIn: string;
      checkOut: string;
      status: string;
      deletedAt: Date | null;
    }>;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const result: Awaited<ReturnType<typeof this.previewConnection>> = {
      feedUrl: connection.icalUrl.replace(/ics=.*/, 'ics=***'),
      today,
      fetchStatus: 'ok',
      events: [],
      dbReservations: [],
    };

    // Load ALL db reservations for this room (including soft-deleted) for context
    const allDbRes = await this.reservationRepo
      .createQueryBuilder('r')
      .where('r.room_id = :roomId', { roomId: connection.roomId })
      .andWhere('r.tenant_id = :tenantId', { tenantId: connection.tenantId })
      .orderBy('r.check_in_date', 'ASC')
      .withDeleted()
      .getMany();

    result.dbReservations = allDbRes.map((r) => ({
      id: r.id,
      channelReservationId: r.channelReservationId ?? null,
      checkIn: r.checkInDate,
      checkOut: r.checkOutDate,
      status: r.status,
      deletedAt: r.deletedAt ?? null,
    }));

    const dbUids = new Set(allDbRes.filter((r) => !r.deletedAt).map((r) => r.channelReservationId?.trim()).filter(Boolean));

    let icsString: string;
    try {
      const response = await axios.get<string>(connection.icalUrl, {
        timeout: 15000, responseType: 'text', maxRedirects: 5,
      });
      icsString = response.data;
    } catch (err: any) {
      result.fetchStatus = 'error';
      result.fetchError = err.message;
      return result;
    }

    let events: ical.CalendarResponse;
    try { events = ical.parseICS(icsString); }
    catch (err: any) {
      result.fetchStatus = 'error';
      result.fetchError = `Parse error: ${err.message}`;
      return result;
    }

    for (const key of Object.keys(events)) {
      const component = events[key] as ical.VEvent;
      if (component.type !== 'VEVENT') continue;

      const uid = (component.uid ?? '').trim();
      const start = component.start as Date | undefined;
      const end   = component.end as Date | undefined;

      if (!uid || !start || !end) {
        result.events.push({
          uid: uid || key, summary: String(component.summary ?? ''),
          checkIn: '', checkOut: '',
          action: 'skip_missing_fields', reason: 'Missing uid, dtstart, or dtend',
          existsInDb: false,
        });
        continue;
      }

      const checkIn  = this.toDateString(start);
      const checkOut = this.toDateString(end);
      const rawSummary = component.summary as string | { val: string } | undefined;
      const summaryStr = rawSummary && typeof rawSummary === 'object' ? (rawSummary as { val: string }).val : (rawSummary ?? '');

      if (checkOut < today) {
        result.events.push({
          uid, summary: summaryStr, checkIn, checkOut,
          action: 'skip_past', reason: `checkout ${checkOut} < today ${today}`,
          existsInDb: dbUids.has(uid),
        });
        continue;
      }

      if (/^(CLOSED|BLOCKED|UNAVAILABLE|NO DISPONIBLE)/i.test(summaryStr.trim())) {
        result.events.push({
          uid, summary: summaryStr, checkIn, checkOut,
          action: 'skip_blocked', reason: 'Summary matches blocked pattern',
          existsInDb: dbUids.has(uid),
        });
        continue;
      }

      const existsInDb = dbUids.has(uid);
      result.events.push({
        uid, summary: summaryStr, checkIn, checkOut,
        action: existsInDb ? 'in_db' : 'import',
        reason: existsInDb ? 'Already in DB' : 'Would be imported as new reservation',
        existsInDb,
      });
    }

    return result;
  }

  private toDateString(d: Date | string): string {
    // Handles both Date objects and ISO string values (node-ical can return either
    // depending on the iCal format — DATE vs DATETIME).
    if (typeof d === 'string') {
      // If it's already YYYY-MM-DD, return as-is; otherwise parse
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      return new Date(d).toISOString().split('T')[0];
    }
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
