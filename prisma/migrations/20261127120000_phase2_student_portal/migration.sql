-- Phase 2 Student Portal Schema Expansion (Additive & Migration-Safe)

DO $$ BEGIN
  CREATE TYPE "StudentAcademicStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'GRADUATED', 'SUSPENDED', 'ALUMNI');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PlacementOfferStatus" AS ENUM ('OFFERED', 'ACCEPTED', 'DECLINED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "GraduateOutcomeType" AS ENUM ('PLACED', 'HIGHER_STUDIES', 'ENTREPRENEURSHIP', 'ALUMNI', 'SEEKING', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "StudentProfile"
  ADD COLUMN IF NOT EXISTS "alternateEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "bio" TEXT,
  ADD COLUMN IF NOT EXISTS "batchLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "academicStatus" "StudentAcademicStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "Achievement"
  ADD COLUMN IF NOT EXISTS "categoryCode" TEXT,
  ADD COLUMN IF NOT EXISTS "subcategory" TEXT,
  ADD COLUMN IF NOT EXISTS "participationLevel" TEXT,
  ADD COLUMN IF NOT EXISTS "teamType" TEXT,
  ADD COLUMN IF NOT EXISTS "teamName" TEXT,
  ADD COLUMN IF NOT EXISTS "result" TEXT,
  ADD COLUMN IF NOT EXISTS "organizer" TEXT,
  ADD COLUMN IF NOT EXISTS "role" TEXT,
  ADD COLUMN IF NOT EXISTS "documentUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "StudentCertification"
  ADD COLUMN IF NOT EXISTS "credentialId" TEXT,
  ADD COLUMN IF NOT EXISTS "credentialUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "duration" TEXT,
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "skillsEarned" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "StudentProject"
  ADD COLUMN IF NOT EXISTS "teamMembers" TEXT,
  ADD COLUMN IF NOT EXISTS "facultyGuide" TEXT,
  ADD COLUMN IF NOT EXISTS "techStack" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "outcomes" TEXT,
  ADD COLUMN IF NOT EXISTS "evidenceUrl" TEXT;

ALTER TABLE "StudentInternship"
  ADD COLUMN IF NOT EXISTS "companyLocation" TEXT,
  ADD COLUMN IF NOT EXISTS "facultyGuide" TEXT,
  ADD COLUMN IF NOT EXISTS "techStack" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "outcomes" TEXT,
  ADD COLUMN IF NOT EXISTS "evidenceUrl" TEXT;

CREATE TABLE IF NOT EXISTS "AchievementCategoryConfig" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subcategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AchievementCategoryConfig_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AchievementCategoryConfig_institution_id_code_key"
  ON "AchievementCategoryConfig"("institution_id", "code");
CREATE INDEX IF NOT EXISTS "AchievementCategoryConfig_institution_id_sortOrder_idx"
  ON "AchievementCategoryConfig"("institution_id", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "AchievementCategoryConfig"
    ADD CONSTRAINT "AchievementCategoryConfig_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "StudentPlacementOffer" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "studentProfileId" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "packageCtc" TEXT,
  "offerType" TEXT,
  "offeredAt" TIMESTAMP(3),
  "status" "PlacementOfferStatus" NOT NULL DEFAULT 'OFFERED',
  "offerLetterUrl" TEXT,
  "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedByUserId" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentPlacementOffer_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE INDEX IF NOT EXISTS "StudentPlacementOffer_institution_id_studentProfileId_status_idx"
  ON "StudentPlacementOffer"("institution_id", "studentProfileId", "status");

DO $$ BEGIN
  ALTER TABLE "StudentPlacementOffer"
    ADD CONSTRAINT "StudentPlacementOffer_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "StudentPlacementOffer"
    ADD CONSTRAINT "StudentPlacementOffer_institution_id_studentProfileId_fkey"
    FOREIGN KEY ("institution_id", "studentProfileId") REFERENCES "StudentProfile"("institution_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "StudentGraduateOutcome" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "studentProfileId" TEXT NOT NULL,
  "outcomeType" "GraduateOutcomeType" NOT NULL,
  "organizationOrUniversity" TEXT,
  "programOrRole" TEXT,
  "location" TEXT,
  "alumniEmail" TEXT,
  "alumniLinkedin" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "evidenceUrl" TEXT,
  "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedByUserId" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentGraduateOutcome_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentGraduateOutcome_institution_id_studentProfileId_key"
  ON "StudentGraduateOutcome"("institution_id", "studentProfileId");

DO $$ BEGIN
  ALTER TABLE "StudentGraduateOutcome"
    ADD CONSTRAINT "StudentGraduateOutcome_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "StudentGraduateOutcome"
    ADD CONSTRAINT "StudentGraduateOutcome_institution_id_studentProfileId_fkey"
    FOREIGN KEY ("institution_id", "studentProfileId") REFERENCES "StudentProfile"("institution_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
