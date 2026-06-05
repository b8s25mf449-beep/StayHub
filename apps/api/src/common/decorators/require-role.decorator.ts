import { SetMetadata } from '@nestjs/common';

export const ROLE_KEY = 'role';
export const RequireRole = (role: string) => SetMetadata(ROLE_KEY, role);
