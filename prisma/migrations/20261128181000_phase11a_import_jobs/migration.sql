-- Phase 11A: Institutional Bulk Import & Data Migration Center
CREATE TYPE "ImportJobStatus" AS ENUM (
  'VALIDATED',
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'PARTIALLY_FAILED',
  'FAILED',
  'CANCELLED',
  'ROLLED_BACK'
);
CREATE TYPE "ImportConflictMode" AS ENUM ('CREATE_ONLY', 'UPDATE_EXISTING', 'SKIP_EXISTING');
CREATE TYPE "ImportRowStatus" AS ENUM (
  'VALID',
  'INVALID',
  'CREATED',
  'UPDATED',
  'SKIPPED',
  'FAILED',
  'ROLLED_BACK'
);

CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "importType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileFormat" TEXT NOT NULL,
    "conflictMode" "ImportConflictMode" NOT NULL DEFAULT 'SKIP_EXISTING',
    "trustProvenance" TEXT NOT NULL DEFAULT 'SELF_REPORTED',
    "allowOverwriteVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'QUEUED',
    "idempotencyKey" TEXT,
    "columnMappingJson" JSONB,
    "payloadJson" JSONB,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "summaryJson" JSONB,
    "errorReportJson" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE TABLE "ImportJobRow" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "status" "ImportRowStatus" NOT NULL DEFAULT 'VALID',
    "matchKey" TEXT,
    "targetModel" TEXT,
    "targetRecordId" TEXT,
    "rawPayloadJson" JSONB NOT NULL,
    "normalizedJson" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJobRow_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE UNIQUE INDEX "ImportJob_institution_id_idempotencyKey_key" ON "ImportJob"("institution_id", "idempotencyKey");
CREATE INDEX "ImportJob_institution_id_status_createdAt_idx" ON "ImportJob"("institution_id", "status", "createdAt");
CREATE INDEX "ImportJob_status_createdAt_idx" ON "ImportJob"("status", "createdAt");

CREATE UNIQUE INDEX "ImportJobRow_institution_id_importJobId_rowNumber_key" ON "ImportJobRow"("institution_id", "importJobId", "rowNumber");
CREATE INDEX "ImportJobRow_institution_id_importJobId_status_idx" ON "ImportJobRow"("institution_id", "importJobId", "status");

ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImportJobRow" ADD CONSTRAINT "ImportJobRow_institution_id_importJobId_fkey"
    FOREIGN KEY ("institution_id", "importJobId") REFERENCES "ImportJob"("institution_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
