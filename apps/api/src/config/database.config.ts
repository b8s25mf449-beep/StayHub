import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuditLog } from '../modules/auth/entities/audit-log.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { ChannelConnection } from '../modules/channels/entities/channel-connection.entity';
import { Guest } from '../modules/guests/entities/guest.entity';
import { Payment } from '../modules/payments/entities/payment.entity';
import { Property } from '../modules/properties/entities/property.entity';
import { RoomType } from '../modules/properties/entities/room-type.entity';
import { Room } from '../modules/properties/entities/room.entity';
import { RoomRate } from '../modules/rates/entities/room-rate.entity';
import { Reservation } from '../modules/reservations/entities/reservation.entity';
import { Tenant } from '../modules/tenants/entities/tenant.entity';
import { Permission } from '../modules/users/entities/permission.entity';
import { Role } from '../modules/users/entities/role.entity';
import { User } from '../modules/users/entities/user.entity';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    entities: [
      AuditLog,
      RefreshToken,
      ChannelConnection,
      Guest,
      Payment,
      Property,
      RoomType,
      Room,
      RoomRate,
      Reservation,
      Tenant,
      Permission,
      Role,
      User,
    ],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    extra: {
      max: process.env.VERCEL ? 1 : 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    },
  }),
);
