-- Phase 9.1C: Composite indexes for Admin Overview, Verification Queue UNION ALL, and Report Studio

-- Verification status + createdAt DESC across all 15 verifiable tables
CREATE INDEX IF NOT EXISTS "Achievement_inst_ver_created_idx" ON "Achievement" ("institution_id", "verificationStatus", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "StudentCertification_inst_ver_created_idx" ON "StudentCertification" ("institution_id", "verificationStatus", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "StudentResearchPaper_inst_ver_created_idx" ON "StudentResearchPaper" ("institution_id", "verificationStatus", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "StudentPatent_inst_ver_created_idx" ON "StudentPatent" ("institution_id", "verificationStatus", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "StudentInternship_inst_ver_created_idx" ON "StudentInternship" ("institution_id", "verificationStatus", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "FacultyCertification_inst_ver_created_idx" ON "FacultyCertification" ("institution_id", "verificationStatus", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "FacultyResearchPaper_inst_ver_created_idx" ON "FacultyResearchPaper" ("institution_id", "verificationStatus", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "FacultyPatent_inst_ver_created_idx" ON "FacultyPatent" ("institution_id", "verificationStatus", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "FacultyDevelopmentProgram_inst_ver_created_idx" ON "FacultyDevelopmentProgram" ("institution_id", "verificationStatus", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "CanonicalPublication_inst_ver_created_idx" ON "CanonicalPublication" ("institution_id", "verificationStatus", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "FacultyResearchGrant_inst_ver_created_idx" ON "FacultyResearchGrant" ("institution_id", "verificationStatus", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "FacultyConsultancy_inst_ver_created_idx" ON "FacultyConsultancy" ("institution_id", "verificationStatus", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "FacultyContribution_inst_ver_created_idx" ON "FacultyContribution" ("institution_id", "verificationStatus", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "StudentPlacementOffer_inst_ver_created_idx" ON "StudentPlacementOffer" ("institution_id", "verificationStatus", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "StudentGraduateOutcome_inst_ver_created_idx" ON "StudentGraduateOutcome" ("institution_id", "verificationStatus", "createdAt" DESC);

-- Activity date indexes for Report Studio date-range filtering
CREATE INDEX IF NOT EXISTS "Achievement_inst_ver_awarded_idx" ON "Achievement" ("institution_id", "verificationStatus", "awardedAt");
CREATE INDEX IF NOT EXISTS "StudentCertification_inst_ver_issued_idx" ON "StudentCertification" ("institution_id", "verificationStatus", "issuedAt");
CREATE INDEX IF NOT EXISTS "StudentResearchPaper_inst_ver_pub_idx" ON "StudentResearchPaper" ("institution_id", "verificationStatus", "publishedAt");
CREATE INDEX IF NOT EXISTS "StudentInternship_inst_ver_start_idx" ON "StudentInternship" ("institution_id", "verificationStatus", "startDate");
CREATE INDEX IF NOT EXISTS "StudentPlacementOffer_inst_ver_offered_idx" ON "StudentPlacementOffer" ("institution_id", "verificationStatus", "offeredAt");
CREATE INDEX IF NOT EXISTS "FacultyCertification_inst_ver_issued_idx" ON "FacultyCertification" ("institution_id", "verificationStatus", "issuedAt");
CREATE INDEX IF NOT EXISTS "FacultyResearchPaper_inst_ver_pub_idx" ON "FacultyResearchPaper" ("institution_id", "verificationStatus", "publishedAt");
CREATE INDEX IF NOT EXISTS "FacultyDevelopmentProgram_inst_ver_start_idx" ON "FacultyDevelopmentProgram" ("institution_id", "verificationStatus", "startDate");
CREATE INDEX IF NOT EXISTS "CanonicalPublication_inst_ver_pub_idx" ON "CanonicalPublication" ("institution_id", "verificationStatus", "publishedAt");
CREATE INDEX IF NOT EXISTS "FacultyResearchGrant_inst_ver_start_idx" ON "FacultyResearchGrant" ("institution_id", "verificationStatus", "startDate");
CREATE INDEX IF NOT EXISTS "FacultyConsultancy_inst_ver_start_idx" ON "FacultyConsultancy" ("institution_id", "verificationStatus", "startDate");
CREATE INDEX IF NOT EXISTS "FacultyContribution_inst_ver_start_idx" ON "FacultyContribution" ("institution_id", "verificationStatus", "startDate");

-- Category code indexes for Event and Achievement filtering
CREATE INDEX IF NOT EXISTS "Event_inst_categoryCode_idx" ON "Event" ("institution_id", "categoryCode");
CREATE INDEX IF NOT EXISTS "Achievement_inst_categoryCode_idx" ON "Achievement" ("institution_id", "categoryCode");
