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

- **Student Portal (`/student`)**: Maintain institutional identity (enrollment number, department, current semester, admission year), personal contacts, social links, profile photos, track verified extracurricular achievements, manage formal education history, semester-by-semester academic grades (SGPA/CGPA), certifications, research publications, patent filings, projects, internships (with stipend & PPO/job conversion tracking), technical & soft skills, tag claims to NAAC/NBA accreditation criteria, calculate real-time profile completeness, generate live resume previews and download PDF resumes powered by `@react-pdf/renderer`.
- **Faculty Portal (`/faculty`)**: Maintain office contacts, profile photos, LinkedIn and ResearchGate/ORCID research profiles, academic qualifications, teaching and industry experiences, research publications, patent filings, institutional event participation, certifications, and tag claims to accreditation criteria, with full inline edit/delete and verification status badges.
- **Institution Admin Console (`/admin`, `/admin/events`)**: Manage academic departments, invite and provision institution users, schedule campus events, bulk-record participant/winner/organizer outcomes in a single submission, and review/verify student and faculty submitted claims (Approve/Reject).

## Permissions

The role-based permission system controls access to all repository actions:

- `student_profile:read_own`, `student_profile:edit_own`
- `student_education:read_own`, `student_education:edit_own`, `student_education:delete_own`
- `student_certification:read_own`, `student_certification:edit_own`, `student_certification:delete_own`
- `student_research:read_own`, `student_research:edit_own`, `student_research:delete_own`
- `student_patent:read_own`, `student_patent:edit_own`, `student_patent:delete_own`
- `student_project:read_own`, `student_project:edit_own`, `student_project:delete_own`
- `student_internship:read_own`, `student_internship:edit_own`, `student_internship:delete_own`
- `student_skill:read_own`, `student_skill:create_own`, `student_skill:edit_own`, `student_skill:delete_own`
- `student_semester:read_own`, `student_semester:create_own`, `student_semester:edit_own`, `student_semester:delete_own`
- `faculty_profile:read_own`, `faculty_profile:edit_own`
- `faculty_education:read_own`, `faculty_education:edit_own`, `faculty_education:delete_own`
- `faculty_experience:read_own`, `faculty_experience:edit_own`, `faculty_experience:delete_own`
- `faculty_certification:read_own`, `faculty_certification:edit_own`, `faculty_certification:delete_own`
- `faculty_research:read_own`, `faculty_research:edit_own`, `faculty_research:delete_own`
- `faculty_patent:read_own`, `faculty_patent:edit_own`, `faculty_patent:delete_own`
- `achievement:read_own`, `achievement:create_own`, `achievement:edit_own`, `achievement:delete_own`
- `record:verify` (review and approve/reject claims for Admin and Faculty)
- `event:create`, `event:archive`, `event:enter_results`, `event:participate`
- `department:manage`, `course:manage`, `user:manage`, `user:import`
- `document:upload`, `document:read_own`

## Demo Accounts

The database seed provides three pre-configured accounts:

| Portal | Email | Password |
|---|---|---|
| **Institution Admin** | `admin@attainly.demo` | `AttainlyDemo!2026` |
| **Faculty Portal** | `faculty@attainly.demo` | `AttainlyDemo!2026` |
| **Student Portal** | `student@attainly.demo` | `AttainlyDemo!2026` |
