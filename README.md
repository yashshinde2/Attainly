# Attainly — Institutional Academic, Portfolio, Event & Evidence Platform

Attainly is a multi-tenant Next.js, TypeScript, Prisma, PostgreSQL, and NextAuth platform for engineering colleges covering **Student Profiles**, **Faculty Portfolios**, **Admin Command Center**, **Institutional Event Management**, **Verification & Document Vault**, **Report Studio**, and **Inspection Evidence Packages**.

> **Scope Note:** Attainly provides verified institutional record-keeping, event management, reporting, and structured evidence exports. It does **not** implement CO-PO attainment, OBE calculations, or automated accreditation grading.

## Key Modules

- **Student Portal (`/student`)**: Profile completeness, academics, achievements, certifications, projects, internships, research, placements, graduate outcomes, event discovery & registration, document uploads, assigned data collection requests, and PDF resume export.
- **Faculty Portal (`/faculty`)**: Academic qualifications, teaching/industry experience, teaching workload, FDPs/STTPs, canonical & individual research publications, grants, consultancy, contributions, event participation, data collection requests, and PDF Academic CV.
- **Admin Command Center (`/admin`)**: Aggregate KPI dashboard with academic-year and department filters, searchable Student & Faculty directories with PDF dossier/portfolio exports, centralized Verification Center with audit logs, and Institution Settings (Academic Years, Batches, Reference Criteria, HOD/Coordinator assignment).
- **Event Management (`/admin/events`, `/student/events`, `/faculty/events`)**: Configurable categories/subcategories, eligibility-aware individual & team registration, attendance tracking, bulk participant import, completion summaries, institution-branded certificates, and idempotent synchronization to Student Achievements and Faculty Contributions.
- **Report Studio (`/admin/reports`)**: 20 deterministic report presets with explicit counting units, activity-date semantics, grouping, pagination, saved definitions, immutable snapshots, and CSV, native `.xlsx`, and PDF exports.
- **Document Vault (`/admin/documents`) & Inspection Center (`/admin/inspections`)**: Role-scoped evidence search, data collection requests with reminders, and configurable NAAC/NBA/AICTE/Custom ZIP evidence packages (`INDEX.md`, `manifest.json`, `.csv`/`.xlsx` reports, and private evidence files).

## Local Development & Verification

```bash
pnpm install
npx prisma generate
npx prisma db execute --file prisma/migrations/.../migration.sql
npx tsx prisma/seed.ts
npx tsc --noEmit
npm test
npm run build
npm run start
```

## Backup, Restore & Deployment Notes

- Set `DATABASE_URL`, `NEXTAUTH_SECRET` (or `AUTH_SECRET`), `NEXTAUTH_URL`, and `BLOB_READ_WRITE_TOKEN` in production.
- Back up PostgreSQL before running migrations (`pg_dump --format=custom`) and enable provider Point-in-Time Recovery (PITR).
- Rollback: restore the pre-migration PostgreSQL snapshot and redeploy the previous build artifact.
