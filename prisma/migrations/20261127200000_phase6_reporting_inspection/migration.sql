-- Phase 6: Reporting Snapshots, Document Versions, Inspection Collections & Data Collection Requests

ALTER TABLE "Document"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "parentDocumentId" TEXT;

CREATE TABLE IF NOT EXISTS "ReportSnapshot" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "savedReportId" TEXT,
    "name" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "metricDefinition" TEXT NOT NULL,
    "verificationScope" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportSnapshot_pkey" PRIMARY KEY ("institution_id","id")
);

CREATE INDEX IF NOT EXISTS "ReportSnapshot_institution_id_entityType_createdAt_idx"
ON "ReportSnapshot"("institution_id", "entityType", "createdAt");

DO $$ BEGIN
  ALTER TABLE "ReportSnapshot"
  ADD CONSTRAINT "ReportSnapshot_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "InspectionCollection" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "framework" TEXT NOT NULL DEFAULT 'CUSTOM',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "academicYearIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "departmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reportIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "includeUnverified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "lastExportedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionCollection_pkey" PRIMARY KEY ("institution_id","id")
);

CREATE INDEX IF NOT EXISTS "InspectionCollection_institution_id_framework_createdAt_idx"
ON "InspectionCollection"("institution_id", "framework", "createdAt");

DO $$ BEGIN
  ALTER TABLE "InspectionCollection"
  ADD CONSTRAINT "InspectionCollection_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DataCollectionRequest" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetType" TEXT NOT NULL DEFAULT 'DOCUMENT',
    "targetUserId" TEXT NOT NULL,
    "departmentId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "linkedEntityType" TEXT,
    "linkedEntityId" TEXT,
    "linkedDocumentId" TEXT,
    "responseNote" TEXT,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastRemindedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataCollectionRequest_pkey" PRIMARY KEY ("institution_id","id")
);

CREATE INDEX IF NOT EXISTS "DataCollectionRequest_institution_id_targetUserId_status_idx"
ON "DataCollectionRequest"("institution_id", "targetUserId", "status");

CREATE INDEX IF NOT EXISTS "DataCollectionRequest_institution_id_status_dueDate_idx"
ON "DataCollectionRequest"("institution_id", "status", "dueDate");

DO $$ BEGIN
  ALTER TABLE "DataCollectionRequest"
  ADD CONSTRAINT "DataCollectionRequest_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
