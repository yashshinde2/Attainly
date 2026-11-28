-- Phase 11D: Administrative Productivity and Smart Workflows

CREATE TABLE IF NOT EXISTS "ReviewerAssignmentRule" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "departmentId" TEXT,
  "itemType" TEXT NOT NULL DEFAULT 'ALL',
  "reviewerUserId" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReviewerAssignmentRule_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE TABLE IF NOT EXISTS "DataCollectionTemplate" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "targetType" TEXT NOT NULL DEFAULT 'DOCUMENT',
  "requireEvidence" BOOLEAN NOT NULL DEFAULT false,
  "defaultDueDays" INTEGER NOT NULL DEFAULT 7,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DataCollectionTemplate_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE TABLE IF NOT EXISTS "AdminReminderRule" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "targetScope" TEXT NOT NULL DEFAULT 'DATA_REQUESTS',
  "daysBeforeDue" INTEGER NOT NULL DEFAULT 2,
  "sendOverdueDigest" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastRunAt" TIMESTAMP(3),
  "lastNotifiedCount" INTEGER NOT NULL DEFAULT 0,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminReminderRule_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE INDEX IF NOT EXISTS "ReviewerAssignmentRule_institution_id_isActive_departmentId_idx" ON "ReviewerAssignmentRule"("institution_id", "isActive", "departmentId");
CREATE INDEX IF NOT EXISTS "DataCollectionTemplate_institution_id_createdAt_idx" ON "DataCollectionTemplate"("institution_id", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminReminderRule_institution_id_isActive_idx" ON "AdminReminderRule"("institution_id", "isActive");

ALTER TABLE "ReviewerAssignmentRule" ADD CONSTRAINT "ReviewerAssignmentRule_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DataCollectionTemplate" ADD CONSTRAINT "DataCollectionTemplate_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminReminderRule" ADD CONSTRAINT "AdminReminderRule_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
