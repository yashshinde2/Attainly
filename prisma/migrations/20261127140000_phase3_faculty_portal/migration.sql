-- Phase 3 Faculty Portal Schema Expansion (Additive & Migration-Safe)

ALTER TABLE "FacultyProfile"
  ADD COLUMN IF NOT EXISTS "employmentType" TEXT,
  ADD COLUMN IF NOT EXISTS "joiningDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "specialization" TEXT,
  ADD COLUMN IF NOT EXISTS "bio" TEXT,
  ADD COLUMN IF NOT EXISTS "orcidId" TEXT,
  ADD COLUMN IF NOT EXISTS "googleScholarUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "scopusAuthorId" TEXT;

CREATE TABLE IF NOT EXISTS "FacultyDevelopmentProgram" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "facultyProfileId" TEXT NOT NULL,
  "programType" TEXT NOT NULL DEFAULT 'FDP',
  "title" TEXT NOT NULL,
  "organizer" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'ONLINE',
  "durationDays" INTEGER,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "documentUrl" TEXT,
  "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedByUserId" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FacultyDevelopmentProgram_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE INDEX IF NOT EXISTS "FacultyDevelopmentProgram_institution_id_facultyProfileId_idx"
  ON "FacultyDevelopmentProgram"("institution_id", "facultyProfileId");

DO $$ BEGIN
  ALTER TABLE "FacultyDevelopmentProgram"
    ADD CONSTRAINT "FacultyDevelopmentProgram_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "FacultyDevelopmentProgram"
    ADD CONSTRAINT "FacultyDevelopmentProgram_institution_id_facultyProfileId_fkey"
    FOREIGN KEY ("institution_id", "facultyProfileId") REFERENCES "FacultyProfile"("institution_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "FacultyTeachingLoad" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "facultyProfileId" TEXT NOT NULL,
  "academicYear" TEXT NOT NULL,
  "semester" INTEGER NOT NULL,
  "subjectName" TEXT NOT NULL,
  "subjectCode" TEXT,
  "hoursPerWeek" INTEGER NOT NULL,
  "studentCount" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FacultyTeachingLoad_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE INDEX IF NOT EXISTS "FacultyTeachingLoad_institution_id_facultyProfileId_academicYea_idx"
  ON "FacultyTeachingLoad"("institution_id", "facultyProfileId", "academicYear");

DO $$ BEGIN
  ALTER TABLE "FacultyTeachingLoad"
    ADD CONSTRAINT "FacultyTeachingLoad_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "FacultyTeachingLoad"
    ADD CONSTRAINT "FacultyTeachingLoad_institution_id_facultyProfileId_fkey"
    FOREIGN KEY ("institution_id", "facultyProfileId") REFERENCES "FacultyProfile"("institution_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "CanonicalPublication" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "publicationType" TEXT NOT NULL DEFAULT 'JOURNAL',
  "journalOrConference" TEXT,
  "publisher" TEXT,
  "doi" TEXT,
  "issnOrIsbn" TEXT,
  "indexing" TEXT,
  "authorsText" TEXT,
  "publishedAt" TIMESTAMP(3),
  "fileUrl" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedByUserId" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CanonicalPublication_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CanonicalPublication_institution_id_doi_key"
  ON "CanonicalPublication"("institution_id", "doi");
CREATE INDEX IF NOT EXISTS "CanonicalPublication_institution_id_publicationType_idx"
  ON "CanonicalPublication"("institution_id", "publicationType");

DO $$ BEGIN
  ALTER TABLE "CanonicalPublication"
    ADD CONSTRAINT "CanonicalPublication_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "PublicationContributor" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "canonicalPublicationId" TEXT NOT NULL,
  "facultyProfileId" TEXT NOT NULL,
  "authorOrder" INTEGER NOT NULL DEFAULT 1,
  "authorRole" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicationContributor_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PublicationContributor_institution_id_canonicalPublicationId_fa_key"
  ON "PublicationContributor"("institution_id", "canonicalPublicationId", "facultyProfileId");
CREATE INDEX IF NOT EXISTS "PublicationContributor_institution_id_facultyProfileId_idx"
  ON "PublicationContributor"("institution_id", "facultyProfileId");

DO $$ BEGIN
  ALTER TABLE "PublicationContributor"
    ADD CONSTRAINT "PublicationContributor_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "PublicationContributor"
    ADD CONSTRAINT "PublicationContributor_institution_id_canonicalPublicationId_fkey"
    FOREIGN KEY ("institution_id", "canonicalPublicationId") REFERENCES "CanonicalPublication"("institution_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "PublicationContributor"
    ADD CONSTRAINT "PublicationContributor_institution_id_facultyProfileId_fkey"
    FOREIGN KEY ("institution_id", "facultyProfileId") REFERENCES "FacultyProfile"("institution_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "FacultyResearchGrant" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "facultyProfileId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "fundingAgency" TEXT NOT NULL,
  "grantNumber" TEXT,
  "amount" TEXT,
  "role" TEXT NOT NULL DEFAULT 'PI',
  "status" TEXT NOT NULL DEFAULT 'ONGOING',
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "documentUrl" TEXT,
  "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedByUserId" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FacultyResearchGrant_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE INDEX IF NOT EXISTS "FacultyResearchGrant_institution_id_facultyProfileId_idx"
  ON "FacultyResearchGrant"("institution_id", "facultyProfileId");

DO $$ BEGIN
  ALTER TABLE "FacultyResearchGrant"
    ADD CONSTRAINT "FacultyResearchGrant_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "FacultyResearchGrant"
    ADD CONSTRAINT "FacultyResearchGrant_institution_id_facultyProfileId_fkey"
    FOREIGN KEY ("institution_id", "facultyProfileId") REFERENCES "FacultyProfile"("institution_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "FacultyConsultancy" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "facultyProfileId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "clientOrganization" TEXT NOT NULL,
  "role" TEXT,
  "amount" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "outcomes" TEXT,
  "documentUrl" TEXT,
  "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedByUserId" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FacultyConsultancy_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE INDEX IF NOT EXISTS "FacultyConsultancy_institution_id_facultyProfileId_idx"
  ON "FacultyConsultancy"("institution_id", "facultyProfileId");

DO $$ BEGIN
  ALTER TABLE "FacultyConsultancy"
    ADD CONSTRAINT "FacultyConsultancy_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "FacultyConsultancy"
    ADD CONSTRAINT "FacultyConsultancy_institution_id_facultyProfileId_fkey"
    FOREIGN KEY ("institution_id", "facultyProfileId") REFERENCES "FacultyProfile"("institution_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "FacultyContribution" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "facultyProfileId" TEXT NOT NULL,
  "contributionType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "organizationOrBody" TEXT,
  "role" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "description" TEXT,
  "documentUrl" TEXT,
  "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedByUserId" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FacultyContribution_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE INDEX IF NOT EXISTS "FacultyContribution_institution_id_facultyProfileId_contribut_idx"
  ON "FacultyContribution"("institution_id", "facultyProfileId", "contributionType");

DO $$ BEGIN
  ALTER TABLE "FacultyContribution"
    ADD CONSTRAINT "FacultyContribution_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "FacultyContribution"
    ADD CONSTRAINT "FacultyContribution_institution_id_facultyProfileId_fkey"
    FOREIGN KEY ("institution_id", "facultyProfileId") REFERENCES "FacultyProfile"("institution_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
