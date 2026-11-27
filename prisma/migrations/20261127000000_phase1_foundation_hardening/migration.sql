-- Phase 1 Foundation Hardening Migration
-- Preserves all existing records and safely normalizes enrollment numbers before adding unique constraints.

-- 1. Create FacultyEmploymentStatus enum
DO $$ BEGIN
  CREATE TYPE "FacultyEmploymentStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'VISITING', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Normalize empty/whitespace StudentProfile.enrollmentNumber to NULL and deduplicate safely
UPDATE "StudentProfile"
SET "enrollmentNumber" = NULL
WHERE "enrollmentNumber" IS NOT NULL AND BTRIM("enrollmentNumber") = '';

WITH ranked_enrollments AS (
  SELECT
    "institution_id",
    "id",
    "enrollmentNumber",
    ROW_NUMBER() OVER (
      PARTITION BY "institution_id", "enrollmentNumber"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS rn
  FROM "StudentProfile"
  WHERE "enrollmentNumber" IS NOT NULL
)
UPDATE "StudentProfile" sp
SET "enrollmentNumber" = sp."enrollmentNumber" || '-DUP-' || LEFT(sp."id", 6)
FROM ranked_enrollments re
WHERE sp."institution_id" = re."institution_id"
  AND sp."id" = re."id"
  AND re.rn > 1;

DROP INDEX IF EXISTS "StudentProfile_institution_id_enrollmentNumber_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "StudentProfile_institution_id_enrollmentNumber_key"
  ON "StudentProfile"("institution_id", "enrollmentNumber");

-- 3. Add FacultyProfile institutional identity fields
ALTER TABLE "FacultyProfile"
  ADD COLUMN IF NOT EXISTS "employeeId" TEXT,
  ADD COLUMN IF NOT EXISTS "departmentId" TEXT,
  ADD COLUMN IF NOT EXISTS "designation" TEXT,
  ADD COLUMN IF NOT EXISTS "employmentStatus" "FacultyEmploymentStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "FacultyProfile"
SET "employeeId" = NULL
WHERE "employeeId" IS NOT NULL AND BTRIM("employeeId") = '';

CREATE UNIQUE INDEX IF NOT EXISTS "FacultyProfile_institution_id_employeeId_key"
  ON "FacultyProfile"("institution_id", "employeeId");

DO $$ BEGIN
  ALTER TABLE "FacultyProfile"
    ADD CONSTRAINT "FacultyProfile_institution_id_departmentId_fkey"
    FOREIGN KEY ("institution_id", "departmentId")
    REFERENCES "Department"("institution_id", "id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Add verification audit fields & version to all 8 verifiable models
ALTER TABLE "Achievement"
  ADD COLUMN IF NOT EXISTS "verifiedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "StudentCertification"
  ADD COLUMN IF NOT EXISTS "verifiedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "StudentResearchPaper"
  ADD COLUMN IF NOT EXISTS "verifiedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "StudentPatent"
  ADD COLUMN IF NOT EXISTS "verifiedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "StudentInternship"
  ADD COLUMN IF NOT EXISTS "verifiedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "FacultyCertification"
  ADD COLUMN IF NOT EXISTS "verifiedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "FacultyResearchPaper"
  ADD COLUMN IF NOT EXISTS "verifiedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "FacultyPatent"
  ADD COLUMN IF NOT EXISTS "verifiedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- 5. Create Document metadata table
CREATE TABLE IF NOT EXISTS "Document" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "pathname" TEXT NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "sha256" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Document_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Document_institution_id_pathname_key"
  ON "Document"("institution_id", "pathname");
CREATE INDEX IF NOT EXISTS "Document_institution_id_ownerUserId_idx"
  ON "Document"("institution_id", "ownerUserId");
CREATE INDEX IF NOT EXISTS "Document_institution_id_entityType_entityId_idx"
  ON "Document"("institution_id", "entityType", "entityId");

DO $$ BEGIN
  ALTER TABLE "Document"
    ADD CONSTRAINT "Document_institution_id_fkey"
    FOREIGN KEY ("institution_id")
    REFERENCES "Institution"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Document"
    ADD CONSTRAINT "Document_institution_id_ownerUserId_fkey"
    FOREIGN KEY ("institution_id", "ownerUserId")
    REFERENCES "User"("institution_id", "id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
