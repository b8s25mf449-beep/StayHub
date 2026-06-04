export interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  phone?: string;
  website?: string;
  country?: string;
  timezone?: string;
  currency?: string;
}

export interface Property {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  status: string;
  city?: string;
  country?: string;
}

export interface RoomType {
  id: string;
  tenantId: string;
  propertyId: string;
  name: string;
  maxOccupancy: number;
  basePrice: number;
  currency?: string;
}

export interface Room {
  id: string;
  tenantId: string;
  propertyId: string;
  roomTypeId: string;
  roomNumber: string;
  floor?: string;
  status: 'available' | 'occupied' | 'maintenance' | 'out_of_order' | 'cleaning';
}

export interface Guest {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  status: 'active' | 'blacklisted' | 'vip';
  totalStays: number;
}

export type ReservationStatus =
  | 'inquiry' | 'pending' | 'confirmed'
  | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';

export type ReservationSource =
  | 'direct' | 'booking_com' | 'airbnb'
  | 'expedia' | 'ical' | 'phone' | 'walk_in';

export interface Reservation {
  id: string;
  tenantId: string;
  propertyId: string;
  roomId: string;
  guestId: string;
  confirmationNumber: string;
  status: ReservationStatus;
  source: ReservationSource;
  checkInDate: string;
  checkOutDate: string;
  adultsCount: number;
  childrenCount: number;
  baseAmount: number;
  taxesAmount: number;
  totalAmount: number;
  channelReservationId?: string;
  notes?: string;
  createdAt: string;
}

export interface ChannelConnection {
  id: string;
  tenantId: string;
  propertyId: string;
  roomId: string;
  channel: 'booking_com' | 'airbnb' | 'expedia' | 'ical' | 'vrbo';
  status: 'active' | 'inactive' | 'error' | 'syncing';
  channelPropertyId?: string;
  lastSyncAt?: string;
  lastSyncCount?: number;
  lastError?: string | null;
}

export interface SyncResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ uid: string; reason: string }>;
}

export interface RoomRate {
  id: string;
  tenantId: string;
  roomId: string | null;
  roomTypeId: string | null;
  name: string;
  pricePerNight: number;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  minNights: number | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StayPrice {
  nights: number;
  baseAmount: number;
  currency: string;
  breakdown: Array<{ date: string; pricePerNight: number; rateName: string }>;
}
