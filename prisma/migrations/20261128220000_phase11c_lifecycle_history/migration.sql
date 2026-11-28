-- Phase 11C: Academic Year, Batch and Institutional Lifecycle Management

ALTER TYPE "FacultyEmploymentStatus" ADD VALUE IF NOT EXISTS 'RETIRED';
ALTER TYPE "FacultyEmploymentStatus" ADD VALUE IF NOT EXISTS 'RELIEVED';
ALTER TYPE "FacultyEmploymentStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TYPE "StudentAcademicStatus" ADD VALUE IF NOT EXISTS 'DISCONTINUED';
ALTER TYPE "StudentAcademicStatus" ADD VALUE IF NOT EXISTS 'TRANSFERRED';

ALTER TABLE "StudentProfile"
  ADD COLUMN IF NOT EXISTS "division" TEXT,
  ADD COLUMN IF NOT EXISTS "isLateralEntry" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "graduationYear" INTEGER,
  ADD COLUMN IF NOT EXISTS "alumniSince" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "discontinuedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastPromotedAcademicYearId" TEXT;

ALTER TABLE "FacultyProfile"
  ADD COLUMN IF NOT EXISTS "relievingDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "retiredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "departmentId" TEXT, ADD COLUMN IF NOT EXISTS "courseId" TEXT;
ALTER TABLE "StudentCertification" ADD COLUMN IF NOT EXISTS "departmentId" TEXT, ADD COLUMN IF NOT EXISTS "courseId" TEXT;
ALTER TABLE "StudentInternship" ADD COLUMN IF NOT EXISTS "departmentId" TEXT, ADD COLUMN IF NOT EXISTS "courseId" TEXT;
ALTER TABLE "StudentPlacementOffer" ADD COLUMN IF NOT EXISTS "departmentId" TEXT, ADD COLUMN IF NOT EXISTS "courseId" TEXT;
ALTER TABLE "FacultyDevelopmentProgram" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE "PublicationContributor" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE "FacultyResearchGrant" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE "FacultyConsultancy" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE "FacultyContribution" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

CREATE TABLE IF NOT EXISTS "LifecycleTransitionBatch" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "targetScope" TEXT NOT NULL,
  "transitionType" TEXT NOT NULL,
  "academicYearId" TEXT,
  "actorUserId" TEXT NOT NULL,
  "reason" TEXT,
  "totalSelected" INTEGER NOT NULL DEFAULT 0,
  "succeededCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LifecycleTransitionBatch_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE TABLE IF NOT EXISTS "StudentLifecycleEvent" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "studentProfileId" TEXT NOT NULL,
  "batchId" TEXT,
  "eventType" TEXT NOT NULL,
  "academicYearId" TEXT,
  "fromDepartmentId" TEXT,
  "toDepartmentId" TEXT,
  "fromCourseId" TEXT,
  "toCourseId" TEXT,
  "fromSemester" INTEGER,
  "toSemester" INTEGER,
  "fromDivision" TEXT,
  "toDivision" TEXT,
  "fromBatchLabel" TEXT,
  "toBatchLabel" TEXT,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorUserId" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentLifecycleEvent_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE TABLE IF NOT EXISTS "FacultyLifecycleEvent" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "facultyProfileId" TEXT NOT NULL,
  "batchId" TEXT,
  "eventType" TEXT NOT NULL,
  "fromDepartmentId" TEXT,
  "toDepartmentId" TEXT,
  "fromDesignation" TEXT,
  "toDesignation" TEXT,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorUserId" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FacultyLifecycleEvent_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE INDEX IF NOT EXISTS "LifecycleTransitionBatch_institution_id_createdAt_idx" ON "LifecycleTransitionBatch"("institution_id", "createdAt");
CREATE INDEX IF NOT EXISTS "StudentLifecycleEvent_institution_id_studentProfileId_createdAt_idx" ON "StudentLifecycleEvent"("institution_id", "studentProfileId", "createdAt");
CREATE INDEX IF NOT EXISTS "StudentLifecycleEvent_institution_id_eventType_academicYearId_idx" ON "StudentLifecycleEvent"("institution_id", "eventType", "academicYearId");
CREATE INDEX IF NOT EXISTS "FacultyLifecycleEvent_institution_id_facultyProfileId_createdAt_idx" ON "FacultyLifecycleEvent"("institution_id", "facultyProfileId", "createdAt");

ALTER TABLE "LifecycleTransitionBatch" ADD CONSTRAINT "LifecycleTransitionBatch_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentLifecycleEvent" ADD CONSTRAINT "StudentLifecycleEvent_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FacultyLifecycleEvent" ADD CONSTRAINT "FacultyLifecycleEvent_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
