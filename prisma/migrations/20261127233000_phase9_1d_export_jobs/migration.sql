-- Phase 9.1D: Durable ExportJob queue for large inspection & evidence packages
DO $$ BEGIN
  CREATE TYPE "ExportJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ExportJob" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "jobType" TEXT NOT NULL DEFAULT 'INSPECTION_PACKAGE',
  "collectionId" TEXT,
  "snapshotId" TEXT,
  "specificationJson" JSONB NOT NULL,
  "status" "ExportJobStatus" NOT NULL DEFAULT 'QUEUED',
  "totalItems" INTEGER NOT NULL DEFAULT 0,
  "processedItems" INTEGER NOT NULL DEFAULT 0,
  "includedFiles" INTEGER NOT NULL DEFAULT 0,
  "missingFiles" INTEGER NOT NULL DEFAULT 0,
  "failedFiles" INTEGER NOT NULL DEFAULT 0,
  "outputSizeBytes" INTEGER,
  "errorMessage" TEXT,
  "storageKey" TEXT,
  "outputFilename" TEXT,
  "outputSha256" TEXT,
  "expiresAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE INDEX IF NOT EXISTS "ExportJob_institution_id_status_createdAt_idx" ON "ExportJob" ("institution_id", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "ExportJob_status_createdAt_idx" ON "ExportJob" ("status", "createdAt");

ALTER TABLE "ExportJob" DROP CONSTRAINT IF EXISTS "ExportJob_institution_id_fkey";
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExportJob" DROP CONSTRAINT IF EXISTS "ExportJob_institution_id_collectionId_fkey";
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_institution_id_collectionId_fkey"
  FOREIGN KEY ("institution_id", "collectionId") REFERENCES "InspectionCollection"("institution_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;
