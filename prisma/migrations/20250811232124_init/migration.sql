-- CreateEnum
CREATE TYPE "public"."SurveyStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "public"."DeleteStrategy" AS ENUM ('hard', 'crypto_erase');

-- CreateTable
CREATE TABLE "public"."Survey" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "public"."SurveyStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currentVersionId" TEXT,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SurveyVersion" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "schemaJson" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SurveyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Submission" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retentionDeadlineAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubmissionSecure" (
    "submissionId" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "iv" BYTEA NOT NULL,
    "authTag" BYTEA NOT NULL,
    "ciphertext" BYTEA NOT NULL,

    CONSTRAINT "SubmissionSecure_pkey" PRIMARY KEY ("submissionId")
);

-- CreateTable
CREATE TABLE "public"."RetentionPolicy" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "daysToRetain" INTEGER NOT NULL,
    "deleteStrategy" "public"."DeleteStrategy" NOT NULL DEFAULT 'hard',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Survey_currentVersionId_key" ON "public"."Survey"("currentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Survey_ownerId_slug_key" ON "public"."Survey"("ownerId", "slug");

-- CreateIndex
CREATE INDEX "SurveyVersion_surveyId_isCurrent_idx" ON "public"."SurveyVersion"("surveyId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyVersion_surveyId_version_key" ON "public"."SurveyVersion"("surveyId", "version");

-- CreateIndex
CREATE INDEX "Submission_surveyId_idx" ON "public"."Submission"("surveyId");

-- CreateIndex
CREATE INDEX "Submission_versionId_idx" ON "public"."Submission"("versionId");

-- CreateIndex
CREATE INDEX "Submission_retentionDeadlineAt_idx" ON "public"."Submission"("retentionDeadlineAt");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionPolicy_surveyId_key" ON "public"."RetentionPolicy"("surveyId");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "public"."AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Survey" ADD CONSTRAINT "Survey_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "public"."SurveyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SurveyVersion" ADD CONSTRAINT "SurveyVersion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "public"."Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Submission" ADD CONSTRAINT "Submission_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "public"."Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Submission" ADD CONSTRAINT "Submission_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "public"."SurveyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubmissionSecure" ADD CONSTRAINT "SubmissionSecure_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "public"."Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RetentionPolicy" ADD CONSTRAINT "RetentionPolicy_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "public"."Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
