import 'server-only';
import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/db';

/** Returns the authenticated userId or redirects to sign-in */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return userId;
}

/** Ensures the provided ownerId matches the current user or 404s */
export function ensureOwnerOrNotFound(ownerId: string, userId: string) {
  if (ownerId !== userId) notFound();
}

/** Fetches a survey and ensures the current user is the owner. Returns minimal survey. */
export async function requireSurveyOwner(surveyId: string) {
  const userId = await requireUserId();
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    select: { id: true, ownerId: true, slug: true, title: true },
  });
  if (!survey) notFound();
  ensureOwnerOrNotFound(survey.ownerId, userId);
  return { userId, survey };
}
