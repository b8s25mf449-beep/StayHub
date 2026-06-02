# StayHub Backend — Phase 0 Implementation Design

**Date:** 2025-06-01
**Scope:** Backend API (NestJS) — Foundation + Auth module
**Status:** Approved by user

---

## What We Are Building

A NestJS REST API backend for StayHub — a multi-tenant SaaS for tourism and hotel property management. This document covers Phase 0 (foundation) and Phase 1 start (Auth module). The full product competes with Hostaway, Guesty, and Lodgify, targeting LATAM first.

Complete architecture is documented in the session context (Pasos 1–9 of the architecture process).

---

## Technology Decisions

| Concern | Choice | Reason |
|---|---|---|
| Framework | NestJS + TypeScript | Typed, modular, decorator-based — matches our architecture |
| Database | Supabase PostgreSQL (existing project) | Free tier, RLS native, Auth built-in |
| ORM | TypeORM with query builder | Parameterized queries, migration support, TypeScript-first |
| Cache / Sessions | Upstash Redis | Free tier compatible, same API as Redis |
| Auth | Custom JWT RS256 + Supabase Auth | RS256 for security, Supabase Auth as identity provider |
| Password hashing | argon2id | OWASP-recommended, memory-hard |
| Validation | class-validator + class-transformer | NestJS native, strict DTOs |
| Testing | Jest + Supertest | NestJS default, integration tests with real DB |
| Documentation | Swagger / OpenAPI via @nestjs/swagger | Auto-generated from decorators |

---

## Project Structure

```
/Users/dannywt1/Documents/Claude/Projects/STAYHUB/
├── apps/
│   └── api/                          # NestJS backend (this phase)
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/             # Login, JWT, 2FA, sessions
│       │   │   ├── tenants/          # Tenant management + onboarding
│       │   │   ├── users/            # User CRUD + role management
│       │   │   ├── properties/       # Property + Room Types + Rooms
│       │   │   ├── guests/           # Guest CRM
│       │   │   ├── reservations/     # Core booking engine
│       │   │   ├── payments/         # Stripe + MercadoPago
│       │   │   ├── channels/         # Integration Gateway + iCal
│       │   │   ├── reports/          # CQRS reporting
│       │   │   └── notifications/    # Email + SMS
│       │   ├── common/
│       │   │   ├── guards/           # JwtAuthGuard, TenantGuard, PermissionGuard
│       │   │   ├── interceptors/     # AuditInterceptor, LoggingInterceptor
│       │   │   ├── pipes/            # ValidationPipe config
│       │   │   ├── decorators/       # @CurrentUser, @RequirePermission, @Public
│       │   │   └── filters/          # GlobalExceptionFilter
│       │   ├── database/
│       │   │   ├── migrations/       # TypeORM migration files
│       │   │   └── seeds/            # Roles, permissions, channels
│       │   ├── config/               # ConfigModule + validation schema
│       │   └── main.ts               # Bootstrap + Helmet + CORS + ValidationPipe
│       ├── test/
│       │   ├── unit/
│       │   ├── integration/          # Tests against real DB
│       │   └── security/             # Cross-tenant isolation tests
│       ├── Dockerfile
│       ├── .env.example
│       └── package.json
├── docs/
│   └── superpowers/
│       └── specs/                    # This file and future specs
└── package.json                      # Root workspace (prepared for monorepo)
```

---

## Implementation Order (Phase 0 → Phase 1)

### Step 1 — Environment Setup
- Install Homebrew on macOS
- Install Node.js 20 LTS via brew
- Install NestJS CLI globally
- Initialize Git repo + connect to GitHub

### Step 2 — Project Scaffold
- `nest new api --strict` inside `apps/`
- Configure TypeScript strict mode
- Install all core dependencies (TypeORM, argon2, jsonwebtoken, class-validator, etc.)
- Set up `main.ts` with Helmet, CORS, GlobalPipes, ValidationPipe

### Step 3 — Database Connection
- Configure TypeORM with Supabase PostgreSQL URL
- Verify connection health
- Run complete SQL schema from architecture (22 tables, RLS, triggers, indexes)
- Run seed data (roles, permissions, channels)

### Step 4 — Auth Module
Components to implement in order:
1. `AuthController` — POST /auth/login, /auth/refresh, /auth/logout, /auth/2fa/*
2. `AuthService` — login flow, JWT generation (RS256), brute force protection
3. `JwtStrategy` — Passport JWT strategy, blacklist check in Redis
4. `TenantGuard` — inject tenant_id from JWT, never from body
5. `PermissionGuard` — check permissions array in JWT payload
6. `PasswordService` — argon2id hash/verify, policy validation, history check
7. `TotpService` — TOTP setup, verify with anti-replay, backup codes
8. `BruteForceService` — Redis counters, progressive lockout
9. `RefreshTokenService` — single-use rotation, reuse detection, device limit

### Step 5 — Health Check + Swagger
- `GET /health` — DB + Redis connectivity
- `GET /health/live` — process alive check
- Swagger UI at `/docs`

---

## Security: Non-Negotiable from Day 1

The following security measures are implemented from the first commit, not added later:

- `whitelist: true, forbidNonWhitelisted: true` on GlobalValidationPipe
- `tenant_id` NEVER accepted from request body or URL params — always from JWT
- Every repository method includes `tenantId` in WHERE clause (IDOR prevention)
- Cross-tenant isolation tests run in CI on every PR
- Helmet.js with full CSP, X-Frame-Options: DENY
- JWT_PRIVATE_KEY stored only in environment variables, never in code

---

## Environment Variables Required

```
# Database
DATABASE_URL=postgresql://...@...supabase.co:5432/postgres

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...

# JWT (RS256 — generate with openssl)
JWT_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----...
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL_DAYS=7

# Encryption (for PII fields: document_number, date_of_birth, totp_secret)
ENCRYPTION_KEY=<32 bytes hex>

# Redis (Upstash)
REDIS_URL=rediss://...upstash.io:6379
REDIS_PASSWORD=...

# App
NODE_ENV=development
PORT=3001
CORS_ORIGINS=http://localhost:3000
```

---

## Success Criteria for Phase 0

- [ ] `npm run start:dev` starts the NestJS server without errors
- [ ] `GET /health` returns `{ status: "ok" }` with DB + Redis connected
- [ ] Swagger UI accessible at `/docs`
- [ ] All 22 DB tables created in Supabase with RLS active
- [ ] `POST /auth/login` returns JWT + refresh token
- [ ] `POST /auth/refresh` rotates the refresh token (old one no longer works)
- [ ] 2FA setup + verify flow works end to end
- [ ] Brute force lockout triggers after 5 failed attempts
- [ ] Cross-tenant isolation test suite passes (tenant A cannot see tenant B data)
- [ ] `npm run test` passes all unit + integration tests

---

## What This Phase Does NOT Include

- Frontend (Next.js) — added in Phase 2
- Payment processing (Stripe / MercadoPago) — Phase 3
- Channel Manager / iCal — Phase 2
- SMS notifications — Phase 4
- Railway deploy config — Phase 1 end
