"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import { auditLog } from "@/lib/audit";
import { requireSurveyOwner } from "@/lib/rbac";

const createSurveySchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and dashes only"),
  retentionDays: z.coerce.number().int().min(1).max(3650).default(365),
});

export async function createSurvey(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const parsed = createSurveySchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    retentionDays: formData.get("retentionDays") ?? 365,
  });

  if (!parsed.success) {
    redirect("/surveys/new?error=invalid_input");
  }

  const { title, slug, retentionDays } = parsed.data;

  try {
    const survey = await prisma.survey.create({
      data: {
        ownerId: userId!,
        slug,
        title,
        status: "draft",
        retentionPolicy: {
          create: {
            daysToRetain: retentionDays,
            deleteStrategy: "hard",
          },
        },
      },
    });
    await auditLog({
      actorId: userId,
      action: "survey_create",
      targetType: "Survey",
      targetId: survey.id,
      meta: { slug },
    });
    redirect(`/surveys/${survey.id}/builder`);
  } catch {
    redirect(`/surveys/new?error=create_failed`);
  }
}

const publishSchema = z.object({
  surveyId: z.string().min(1),
  schemaJson: z.any().default({}), // TODO: replace with validated builder schema
});

const idSchema = z.object({
  surveyId: z.string().min(1),
});

export async function publishSurvey(formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let schemaObj: unknown = {};
  const raw = formData.get("schemaJson");
  if (raw) {
    try {
      schemaObj = JSON.parse(String(raw));
    } catch {
      redirect("/dashboard/surveys?error=publish_invalid_json");
    }
  }
  const parsed = publishSchema.safeParse({
    surveyId: formData.get("surveyId"),
    schemaJson: schemaObj,
  });
  if (!parsed.success) redirect("/dashboard/surveys?error=publish_invalid");

  const { surveyId, schemaJson } = parsed.data;
  await requireSurveyOwner(surveyId);
  const statusRow = await prisma.survey.findUnique({ where: { id: surveyId }, select: { status: true } });
  if (statusRow?.status === "archived") redirect("/dashboard/surveys?error=archived");

  const last = await prisma.surveyVersion.findFirst({
    where: { surveyId },
    orderBy: { version: "desc" },
  });
  const nextVersion = (last?.version ?? 0) + 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tx = await prisma.$transaction(async (db: any) => {
    await db.surveyVersion.updateMany({
      where: { surveyId, isCurrent: true },
      data: { isCurrent: false },
    });

    const version = await db.surveyVersion.create({
      data: {
        surveyId,
        version: nextVersion,
        schemaJson,
        publishedAt: new Date(),
        isCurrent: true,
      },
    });

    await db.survey.update({
      where: { id: surveyId },
      data: { status: "published", currentVersionId: version.id },
    });

    return version;
  });

  await auditLog({
    actorId: userId,
    action: "survey_publish",
    targetType: "Survey",
    targetId: surveyId,
    meta: { version: tx.version },
  });

  redirect(`/surveys/${surveyId}/builder?published=${tx.version}`);
}

export async function archiveSurvey(formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = idSchema.safeParse({ surveyId: formData.get('surveyId') });
  if (!parsed.success) redirect('/dashboard/surveys?error=invalid_input');
  const { surveyId } = parsed.data;
  await requireSurveyOwner(surveyId);

  await prisma.survey.update({ where: { id: surveyId }, data: { status: 'archived' } });
  await auditLog({ actorId: userId, action: 'survey_archive', targetType: 'Survey', targetId: surveyId });
  redirect(`/surveys/${surveyId}/builder?archived=1`);
}

export async function unarchiveSurvey(formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = idSchema.safeParse({ surveyId: formData.get('surveyId') });
  if (!parsed.success) redirect('/dashboard/surveys?error=invalid_input');
  const { surveyId } = parsed.data;
  await requireSurveyOwner(surveyId);

  await prisma.survey.update({ where: { id: surveyId }, data: { status: 'draft' } });
  await auditLog({ actorId: userId, action: 'survey_unarchive', targetType: 'Survey', targetId: surveyId });
  redirect(`/surveys/${surveyId}/builder?unarchived=1`);
}

export async function unpublishSurvey(formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = idSchema.safeParse({ surveyId: formData.get('surveyId') });
  if (!parsed.success) redirect('/dashboard/surveys?error=invalid_input');
  const { surveyId } = parsed.data;
  await requireSurveyOwner(surveyId);

  await prisma.survey.update({ where: { id: surveyId }, data: { status: 'draft' } });
  await auditLog({ actorId: userId, action: 'survey_unpublish', targetType: 'Survey', targetId: surveyId });
  redirect(`/surveys/${surveyId}/builder?draft=1`);
}
