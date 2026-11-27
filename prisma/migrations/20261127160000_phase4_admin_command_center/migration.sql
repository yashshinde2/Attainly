-- Phase 4 Admin Command Center Schema Expansion (Additive & Migration-Safe)

ALTER TABLE "Department"
  ADD COLUMN IF NOT EXISTS "coordinatorUserId" TEXT;

CREATE TABLE IF NOT EXISTS "AcademicYear" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AcademicYear_institution_id_label_key"
  ON "AcademicYear"("institution_id", "label");
CREATE INDEX IF NOT EXISTS "AcademicYear_institution_id_isCurrent_idx"
  ON "AcademicYear"("institution_id", "isCurrent");

DO $$ BEGIN
  ALTER TABLE "AcademicYear"
    ADD CONSTRAINT "AcademicYear_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Batch" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "admissionYear" INTEGER NOT NULL,
  "departmentId" TEXT,
  "courseId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Batch_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Batch_institution_id_name_key"
  ON "Batch"("institution_id", "name");
CREATE INDEX IF NOT EXISTS "Batch_institution_id_admissionYear_idx"
  ON "Batch"("institution_id", "admissionYear");

DO $$ BEGIN
  ALTER TABLE "Batch"
    ADD CONSTRAINT "Batch_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "VerificationAssignment" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "itemType" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "assignedToUserId" TEXT NOT NULL,
  "assignedByUserId" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationAssignment_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VerificationAssignment_institution_id_itemType_itemId_key"
  ON "VerificationAssignment"("institution_id", "itemType", "itemId");
CREATE INDEX IF NOT EXISTS "VerificationAssignment_institution_id_assignedToUserId_idx"
  ON "VerificationAssignment"("institution_id", "assignedToUserId");

DO $$ BEGIN
  ALTER TABLE "VerificationAssignment"
    ADD CONSTRAINT "VerificationAssignment_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "VerificationAuditLog" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "itemType" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "assignedToUserId" TEXT,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationAuditLog_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE INDEX IF NOT EXISTS "VerificationAuditLog_institution_id_itemType_itemId_idx"
  ON "VerificationAuditLog"("institution_id", "itemType", "itemId");
CREATE INDEX IF NOT EXISTS "VerificationAuditLog_institution_id_createdAt_idx"
  ON "VerificationAuditLog"("institution_id", "createdAt");

DO $$ BEGIN
  ALTER TABLE "VerificationAuditLog"
    ADD CONSTRAINT "VerificationAuditLog_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
