import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { SubmissionPayloadSchema } from "@/lib/validation";
import { encryptJSON } from "@/lib/crypto";

export async function POST(req: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  try {
    const slug = params.slug;
    const json = await req.json().catch(() => null);
    const parsed = SubmissionPayloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const survey = await prisma.survey.findUnique({
      where: { slug },
      include: { currentVersion: true, retentionPolicy: true },
    });
    if (!survey || survey.status !== "published" || !survey.currentVersion) {
      return NextResponse.json({ error: "survey_not_found_or_unpublished" }, { status: 404 });
    }

    const retentionDays = survey.retentionPolicy?.daysToRetain ?? 365;
    const now = new Date();
    const retentionDeadlineAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);

    const answers = parsed.data.answers ?? {};
    const encrypted = encryptJSON({ answers, version: survey.currentVersion.version });

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const sub = await tx.submission.create({
        data: {
          surveyId: survey.id,
          versionId: survey.currentVersion!.id,
          submittedAt: now,
          retentionDeadlineAt,
        },
        select: { id: true },
      });
      await tx.submissionSecure.create({
        data: {
          submissionId: sub.id,
          keyId: encrypted.keyId,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          ciphertext: encrypted.ciphertext,
        },
      });
      return sub;
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e) {
    console.error("Submissions API error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
