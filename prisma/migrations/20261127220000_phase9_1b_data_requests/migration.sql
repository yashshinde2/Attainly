-- Phase 9.1B: Data Collection Request Evidence Requirements & Review Feedback
ALTER TABLE "DataCollectionRequest"
  ADD COLUMN IF NOT EXISTS "requireEvidence" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reviewFeedback" TEXT;
