# Engineering College Portal — Product & Architecture Plan

Phase 1 scope: Student Profile, Faculty Profile, Admin & Event Management — built for a single multi-department engineering college first, architected so it can later be sold to other institutions.

## 1. Positioning: what you're building vs. Studium

Studium (studiumtech.in) sells accreditation *strategy and benchmarking* to institutions that already have data discipline — it's a top-down compliance/consulting product (NAAC/NBA/NIRF scoring, SSR/SAR report generation, a "Benchmark" strategy layer on top). It's built for institutions, not for the day-to-day user filling in their own profile.

Your wedge is different and genuinely defensible: a **bottom-up, person-first system**. Students and faculty maintain rich, well-categorized profiles because it's useful *to them* (auto-built resume/CV, a portfolio of achievements, a single place for certificates) — and the accreditation-readiness data falls out of that as a side effect, not as the main sales pitch. That's a better adoption story for a single college with no budget for an enterprise accreditation suite, and it's a cleaner starting point than copying Studium's compliance-first framing.

Concretely, differentiate on:

- **Individual value first** — resume/CV generation and achievement tracking that students actually want to use, not just a data-entry chore for the institution.
- **Criterion tagging as a byproduct** — every achievement/paper/event can be optionally tagged to a NAAC/NBA/AICTE criterion code, so reports assemble themselves later without students needing to think about accreditation at all.
- **Mobile-first admin**, which is explicitly not Studium's focus.
- **Modern, distinctive UI** (see §7) instead of the generic enterprise-SaaS look most ed-tech tools share.

## 2. High-level architecture

```
[ Next.js app (Vercel) ]
  ├─ Public/marketing pages
  ├─ Student portal (profile, achievements, resume export)
  ├─ Faculty portal (profile, research, experience)
  ├─ Admin console (users, departments, events, reports)
  │
  ├─ Server Actions / Route Handlers (API layer)
  │     ├─ Auth & RBAC middleware
  │     ├─ Domain services (student, faculty, event, report)
  │     └─ File upload handling (certificates, papers, photos)
  │
  └─ Data layer: Prisma ORM
        ↓
[ PostgreSQL (Neon or Supabase) ] ── multi-tenant from day 1 (institution_id on every table)
        +
[ Object storage ] (Vercel Blob / Supabase Storage) — certificates, resumes, papers, patents
```

Key architectural decision: **design multi-tenant from the start** even though you're launching with one college. Every table carries an `institution_id`. It costs almost nothing now and saves you a painful migration the moment a second college wants in — which is exactly your long-term plan.

## 3. Recommended tech stack

A clarification first: **Antigravity is an IDE (an agentic coding environment), not a backend framework** — it's where you'll write backend code, not a technology choice in itself. You still need to pick an actual backend stack to build inside it.

| Layer | Recommendation | Why |
| --- | --- | --- |
| Frontend | **Next.js 15 (App Router) + TypeScript** | Matches your Vercel plan exactly; server components cut client JS; one framework for marketing site + app. |
| UI layer | **Tailwind CSS + shadcn/ui** (customized, not left default) | Fast to build with, fully themeable so it doesn't look like a template — see §7. |
| Backend (Phase 1) | **Next.js Server Actions + Route Handlers**, written in Antigravity, same repo | For a 3–4 person team on a deadline, one deployable codebase beats managing two services. Vercel runs this as serverless functions automatically. |
| Backend (future split point) | Extract into a standalone **NestJS (Node/TypeScript)** service if/when you add heavy background jobs, multi-institution billing, or a public API | NestJS's module structure maps cleanly onto RBAC + multi-tenant domains if you outgrow the monolith. Design your service layer (see §5) so this extraction is a lift-and-shift, not a rewrite. |
| Database | **PostgreSQL** via **Neon** (serverless Postgres, branches per environment) or **Supabase** (if you also want built-in auth/storage) | Relational integrity matters here — categorized achievements, RBAC joins, and accreditation reporting are all relational problems, not document-store problems. |
| ORM | **Prisma** | Type-safe queries, painless migrations, great with Next.js + TypeScript. |
| Auth | **Auth.js (NextAuth)** with a custom RBAC layer, or **Clerk** if you want to move faster and pay a small fee per MAU | Either way, store `role` + `institution_id` in the session token so every request can be scoped without extra DB round-trips. |
| File storage | **Vercel Blob** or **Supabase Storage** | Certificates, resumes, research papers, profile photos. |
| PWA | **@ducanh2912/next-pwa** (maintained fork for App Router) | Gives the admin console install-to-home-screen + offline shell on mobile with minimal config on top of Next.js. |
| Reporting/export | **react-pdf** or **Puppeteer-on-Vercel** for PDF resumes/reports; **exceljs** for NAAC/NBA data exports | Both are standard, well-documented in the Next.js/Vercel ecosystem. |
| Hosting | **Vercel** (frontend + API routes), **Neon/Supabase** (DB), optional **Render/Railway** later if you split out NestJS | Keeps you on your stated plan while leaving a clear upgrade path. |

This is a single Next.js monolith to start — the right call for a 3–4 person student team shipping a first version — with service-layer boundaries clean enough to split later without a rewrite.

**Staying in Node/TypeScript as the roadmap grows:** the two planned future modules don't change this. Smart outcome-based evaluation (CO-PO attainment) is formula-driven computation over relational data, not machine learning — plain TypeScript services handle it well. An AI assistant is LLM API calls, not model training — Vercel's AI SDK is built for exactly this inside Next.js. The one case that would justify a separate Python (FastAPI) service later is training your own predictive models (e.g. at-risk-student prediction) on the data this system collects — a genuinely different kind of work from calling an LLM. That's a future add-on behind an internal API, not a reason to switch stacks now.

## 4. Roles & RBAC design

Don't hardcode roles as scattered `if (role === 'admin')` checks — model it as data so you can add roles (HOD, placement cell, alumni) later without touching code.

**Core roles for Phase 1:**

- `SUPER_ADMIN` — you (the platform operator); only matters once you have >1 institution.
- `INSTITUTION_ADMIN` — the college's admin; manages departments, courses, events, users, reports.
- `FACULTY` — manages own profile; can be given event-organizer permissions per event.
- `STUDENT` — manages own profile and achievements.

**Design pattern:** a `Role` table and a `Permission` table with a many-to-many `RolePermission` join, rather than an enum baked into application logic. Enforce permissions in two layers:

1. **Application layer** — middleware checks `permission` strings (e.g. `event:create`, `student_profile:edit_own`, `report:generate`) on every server action/route handler.
2. **Database layer (defense in depth)** — if you use Supabase, turn on Row-Level Security policies keyed on `institution_id` + `user_id`, so even a bug in application logic can't leak another institution's or another student's data.

Every row in every table should be reachable only through its `institution_id` — this is what makes RBAC *and* future multi-tenancy both work from the same mechanism.

## 5. Core data model

```
Institution
  └─ Department (name, code)
       └─ Course (e.g., B.Tech CSE, batch year)

User (base identity: email, password hash, institution_id, role)
  ├─ StudentProfile
  │     ├─ PersonalDetails (name, DOB, address, phone, photo)
  │     ├─ EducationRecord[]        (level: 10th | 12th | degree; board/university, %/CGPA, year)
  │     ├─ Achievement[]            (category: technical | non-technical | sports | cultural;
  │     │                            type: participation | winner; position, event_id FK)
  │     ├─ Certification[]          (title, issuer, date, file_url, category)
  │     ├─ ResearchPaper[]          (title, venue, year, co-authors, DOI/link, file_url)
  │     ├─ Patent[]                 (title, status, number, year, file_url)
  │     ├─ Project[]                (title, description, tech_stack, repo/demo link)
  │     ├─ Internship[]             (organization, role, duration, certificate_url)
  │     └─ CriterionTag[]           (optional link from any item above to a NAAC/NBA/AICTE code)
  │
  ├─ FacultyProfile
  │     ├─ PersonalDetails
  │     ├─ EducationQualification[] (degree, specialization, university, year)
  │     ├─ ExperienceRecord[]       (organization, designation, from/to, type: teaching | industry)
  │     ├─ Certification[]
  │     ├─ ResearchPaper[]
  │     ├─ Patent[]
  │     └─ CriterionTag[]
  │
  └─ AdminProfile (for INSTITUTION_ADMIN users)

Event
  (title, type: technical | non-technical | sports | cultural, department_id,
   start_date, end_date, description, created_by, status)
  └─ EventParticipation (user_id, role: participant | winner | organizer, position, certificate_url)

Report
  (institution_id, generated_by, date_range, criteria_covered[], export_format, file_url)
```

Notes on this shape:

- **Achievements and EventParticipation are linked but distinct.** An achievement can exist standalone (e.g. a certification from an external course) or be tied to an institution-run `Event`. Don't force every achievement through the event table — students will have plenty that aren't tied to a college-organized event.
- **CriterionTag is the accreditation bridge.** Keep it as a lightweight, optional join table (`item_type`, `item_id`, `criterion_code`) rather than baking criterion fields into every profile table — NAAC/NBA/AICTE codes change between cycles, and you don't want a migration every time a framework updates.
- **Everything that can carry a file** (certificates, papers, patents, resumes) stores a `file_url` pointing at object storage, never the file itself in Postgres.

## 6. Module specs

### Student Profile

- Structured sections (not one long form): Personal & Contact → Education History → Achievements → Certifications → Research & IP → Projects & Internships.
- Each achievement/certification entry requires a category at creation time (technical/non-technical/sports/cultural; participation/winner) — categorization is enforced at data-entry, not cleaned up later.
- One-click **resume/CV export** (PDF) that pulls from the structured data — this is the feature that gets students to actually fill their profile in properly, and it's also your strongest adoption lever over a compliance-only tool.
- Profile completeness indicator, to nudge students toward thorough records ahead of accreditation visits.

### Faculty Profile

- Mirrors the student structure: Personal → Education Qualifications → Experience (teaching + industry, separately) → Certifications → Research Papers → Patents.
- Same optional criterion-tagging so faculty research/patents roll up into NAAC/NBA/AICTE reporting automatically.

### Admin & Event Management

- Manage departments, courses, and user accounts (invite/add/remove students & faculty, bulk CSV import for onboarding a whole batch at once).
- Create/edit/archive events with type, department, and dates; assign faculty as event organizers.
- Record participation and results per event (bulk-entry UI for "add winners," not one row at a time).
- **Report builder**: pick a date range and/or criteria set, generate a categorized export (PDF/Excel) for NAAC/NBA/AICTE visits, pulling from tagged achievements, papers, and events across the institution.
- All of this needs to work comfortably on a phone screen — this is the PWA requirement, not an afterthought bolted on later.

## 7. UI/UX direction

Avoid the two failure modes you named: generic old-style college ERP, and Studium's own enterprise-SaaS blue-and-white look (which is also what most competitors default to).

Direction to build toward:

- **A distinctive, warm-but-professional palette** — e.g. a deep indigo or forest-teal primary paired with a warm amber/coral accent on an off-white (not stark white) background, rather than default SaaS blue. Support dark mode from the start — the admin console will get used at odd hours.
- **Calm information density**: cards and tabs for profile sections rather than one giant scroll; this also doubles as the mobile layout.
- **Consistent, custom-themed shadcn/ui components** (not left at default Tailwind blue) so it doesn't read as a template.
- Treat the resume/CV export as a design surface in its own right — it's what students will actually show employers, so it should look better than a generic template.

When you're ready to move from direction to actual screens, that's a good moment to generate real mockups rather than describe them in more prose.

## 8. PWA & mobile strategy

- Build responsive-first with Tailwind from day one — don't retrofit mobile layouts later.
- Add a web app manifest + service worker (via `next-pwa`) so the admin can install the console to their home screen and get basic offline shell caching.
- Prioritize the admin console's mobile experience explicitly in testing — event creation, bulk result entry, and report generation are the flows an admin is most likely to do from a phone.

## 9. Suggested build phases

| Phase | Scope | Rough effort (3–4 person team) |
| --- | --- | --- |
| 0 | Repo, Next.js + Prisma + Neon/Supabase setup, Vercel project, auth skeleton, design tokens | 1–2 weeks |
| 1 | Student Profile module end-to-end, incl. resume export | 3–4 weeks |
| 2 | Faculty Profile module | 2–3 weeks |
| 3 | Admin console: departments/users/courses + Event Management + participation entry | 3–4 weeks |
| 4 | Report builder (PDF/Excel export, criterion tagging), PWA polish, mobile QA | 2 weeks |
| 5 | Pilot with your own college, gather feedback, harden for a second institution | ongoing |

## 10. Immediate next steps

1. Set up the repo (Next.js + TypeScript + Tailwind + Prisma), a Neon or Supabase Postgres instance, and a Vercel project — this is Phase 0 and can start today.
2. Lock the Prisma schema for Institution/Department/User/StudentProfile/FacultyProfile/Event before writing any UI — the data model in §5 is the backbone everything else depends on.
3. Build auth + the role/permission tables first, even with just two roles wired up (`INSTITUTION_ADMIN`, `STUDENT`) — retrofitting RBAC after features exist is much more painful than building on top of it.
4. Build the Student Profile module first (highest individual value, proves the resume-export hook), then Faculty, then Admin/Events.
5. When you're ready for actual screen designs, come back and we can build real mockups against this data model and palette direction.
