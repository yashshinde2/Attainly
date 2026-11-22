# Attainly

Attainly is an institutional academic and campus management platform built with Next.js, Prisma, and PostgreSQL. It provides dedicated portals and role-based workspaces for Students, Faculty, and Institution Administrators.

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy the example environment file and update values as needed:

```bash
cp .env.example .env.local
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string.
- `NEXTAUTH_SECRET`: Secret key for NextAuth session JWT tokens.
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob token for document uploads.

### 3. Database Migration

Generate the Prisma client and push/migrate database schema:

```bash
npx prisma db push
```

*(Or `npx prisma migrate dev` if managing migration files)*

### 4. Seed Demo Data

Populate the database with the demo institution, roles, permissions, and sample user profiles:

```bash
pnpm db:seed
```

### 5. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Demo Accounts

The database seed provides three pre-configured accounts:

| Portal | Email | Password |
|---|---|---|
| **Institution Admin** | `admin@attainly.demo` | `AttainlyDemo!2026` |
| **Faculty Portal** | `faculty@attainly.demo` | `AttainlyDemo!2026` |
| **Student Portal** | `student@attainly.demo` | `AttainlyDemo!2026` |
