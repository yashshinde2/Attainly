-- Phase 5: Event Management & Student/Faculty Profile Integration

CREATE TABLE IF NOT EXISTS "EventCategoryConfig" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "subcategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventCategoryConfig_pkey" PRIMARY KEY ("institution_id","id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EventCategoryConfig_institution_id_code_key"
ON "EventCategoryConfig"("institution_id", "code");

DO $$ BEGIN
  ALTER TABLE "EventCategoryConfig"
  ADD CONSTRAINT "EventCategoryConfig_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "categoryCode" TEXT,
  ADD COLUMN IF NOT EXISTS "subcategory" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN IF NOT EXISTS "coordinatorUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "venue" TEXT,
  ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT 'OFFLINE',
  ADD COLUMN IF NOT EXISTS "level" TEXT NOT NULL DEFAULT 'INSTITUTION',
  ADD COLUMN IF NOT EXISTS "registrationDeadline" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "capacity" INTEGER,
  ADD COLUMN IF NOT EXISTS "allowTeamRegistration" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "maxTeamSize" INTEGER,
  ADD COLUMN IF NOT EXISTS "eligibilityRoles" TEXT[] DEFAULT ARRAY['STUDENT', 'FACULTY']::TEXT[],
  ADD COLUMN IF NOT EXISTS "eligibleDepartmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "eligibleBatches" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN IF NOT EXISTS "supportingDocUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "certificateTemplateEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "completionSummary" TEXT,
  ADD COLUMN IF NOT EXISTS "completionReportUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "completionPhotoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "feedbackSummary" TEXT,
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Event_institution_id_status_startsAt_idx"
ON "Event"("institution_id", "status", "startsAt");

ALTER TABLE "EventParticipation"
  ADD COLUMN IF NOT EXISTS "registrationStatus" TEXT NOT NULL DEFAULT 'REGISTERED',
  ADD COLUMN IF NOT EXISTS "attendanceStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "teamName" TEXT,
  ADD COLUMN IF NOT EXISTS "teamRole" TEXT,
  ADD COLUMN IF NOT EXISTS "certificateRef" TEXT,
  ADD COLUMN IF NOT EXISTS "syncedAchievementId" TEXT,
  ADD COLUMN IF NOT EXISTS "syncedContributionId" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "confirmedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

CREATE INDEX IF NOT EXISTS "EventParticipation_institution_id_eventId_registrationStatus_idx"
ON "EventParticipation"("institution_id", "eventId", "registrationStatus");

ALTER TABLE "Achievement"
  ADD COLUMN IF NOT EXISTS "sourceEventId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Achievement_institution_id_studentProfileId_sourceEventId_key"
ON "Achievement"("institution_id", "studentProfileId", "sourceEventId");

ALTER TABLE "FacultyContribution"
  ADD COLUMN IF NOT EXISTS "sourceEventId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "FacultyContribution_institution_id_facultyProfileId_sourceEventId_key"
ON "FacultyContribution"("institution_id", "facultyProfileId", "sourceEventId");
