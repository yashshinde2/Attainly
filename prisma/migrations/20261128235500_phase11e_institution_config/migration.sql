-- Phase 11E: Institution Configuration and Custom Profile Requirements

CREATE TABLE IF NOT EXISTS "InstitutionConfig" (
  "institution_id" TEXT NOT NULL,
  "academicYearStartMonth" INTEGER NOT NULL DEFAULT 7,
  "gradingScaleType" TEXT NOT NULL DEFAULT 'CGPA_10',
  "gradingScaleMax" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "studentIdLabel" TEXT NOT NULL DEFAULT 'Enrollment Number',
  "facultyIdLabel" TEXT NOT NULL DEFAULT 'Employee ID',
  "facultyDesignations" TEXT[] NOT NULL DEFAULT ARRAY['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Visiting Faculty'],
  "employmentCategories" TEXT[] NOT NULL DEFAULT ARRAY['Regular', 'Contract', 'Ad-hoc', 'Visiting'],
  "allowedDocumentTypes" TEXT[] NOT NULL DEFAULT ARRAY['application/pdf', 'image/jpeg', 'image/png'],
  "requireEvidenceForClaims" BOOLEAN NOT NULL DEFAULT false,
  "mandatoryStudentFields" TEXT[] NOT NULL DEFAULT ARRAY['phone', 'dateOfBirth', 'address'],
  "mandatoryFacultyFields" TEXT[] NOT NULL DEFAULT ARRAY['phone', 'designation', 'specialization'],
  "reportHeaderTitle" TEXT,
  "reportHeaderSubtitle" TEXT,
  "brandPrimaryColor" TEXT,
  "inspectionTemplatesJson" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InstitutionConfig_pkey" PRIMARY KEY ("institution_id")
);

CREATE TABLE IF NOT EXISTS "CustomFieldDefinition" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "dataType" TEXT NOT NULL DEFAULT 'TEXT',
  "profileType" TEXT NOT NULL DEFAULT 'STUDENT',
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "allowedValues" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "validationRegex" TEXT,
  "visibilityScope" TEXT NOT NULL DEFAULT 'SELF_AND_ADMIN',
  "reportEligible" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE TABLE IF NOT EXISTS "CustomFieldValue" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "definitionId" TEXT NOT NULL,
  "definitionVersion" INTEGER NOT NULL DEFAULT 1,
  "fieldKey" TEXT NOT NULL,
  "profileType" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "valueText" TEXT,
  "updatedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("institution_id", "id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomFieldDefinition_institution_id_profileType_fieldKey_key"
  ON "CustomFieldDefinition"("institution_id", "profileType", "fieldKey");
CREATE INDEX IF NOT EXISTS "CustomFieldDefinition_institution_id_profileType_isActive_idx"
  ON "CustomFieldDefinition"("institution_id", "profileType", "isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "CustomFieldValue_institution_id_profileType_profileId_fieldKey_key"
  ON "CustomFieldValue"("institution_id", "profileType", "profileId", "fieldKey");
CREATE INDEX IF NOT EXISTS "CustomFieldValue_institution_id_profileType_profileId_idx"
  ON "CustomFieldValue"("institution_id", "profileType", "profileId");

ALTER TABLE "InstitutionConfig" ADD CONSTRAINT "InstitutionConfig_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomFieldDefinition" ADD CONSTRAINT "CustomFieldDefinition_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
