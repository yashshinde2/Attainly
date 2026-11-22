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

## Features & Portals

- **Student Portal (`/student`)**: Maintain personal contact details, track verified extracurricular achievements, manage education history (10th/12th/Degree/Other), certifications, research papers, patents, projects & internships with document attachments, calculate profile completeness progress, generate and download formatted PDF resumes powered by `@react-pdf/renderer`, and view campus events participated in or won.
- **Faculty Portal (`/faculty`)**: Maintain office contacts, academic qualifications, teaching and industry experiences, research papers, patents, institutional event participation, and certifications.
- **Institution Admin Console (`/admin`, `/admin/events`)**: Manage academic departments, invite and provision institution users, schedule campus events, and bulk-record participant/winner/organizer outcomes in a single submission.

## Permissions

The role-based permission system controls access to all repository actions:

- `student_profile:read_own`, `student_profile:edit_own`
- `student_education:read_own`, `student_education:edit_own`
- `student_certification:read_own`, `student_certification:edit_own`
- `student_research:read_own`, `student_research:edit_own`
- `student_patent:read_own`, `student_patent:edit_own`
- `student_project:read_own`, `student_project:edit_own`
- `student_internship:read_own`, `student_internship:edit_own`
- `achievement:create_own`, `achievement:list_own`
- `event:create`, `event:archive`, `event:enter_results`, `event:participate`
- `department:manage`, `course:manage`, `user:manage`

## Demo Accounts

The database seed provides three pre-configured accounts:

| Portal | Email | Password |
|---|---|---|
| **Institution Admin** | `admin@attainly.demo` | `AttainlyDemo!2026` |
| **Faculty Portal** | `faculty@attainly.demo` | `AttainlyDemo!2026` |
| **Student Portal** | `student@attainly.demo` | `AttainlyDemo!2026` |
