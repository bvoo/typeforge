import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

async function runOnce(limit = 500) {
  const now = new Date();
  const subs = await prisma.submission.findMany({
    where: {
      retentionDeadlineAt: { lte: now },
    },
    select: { id: true },
    take: limit,
  });
  if (subs.length === 0) return { deleted: 0 };
  const ids = subs.map((s: { id: string }) => s.id);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const id of ids) {
      await tx.auditLog.create({
        data: {
          actorId: null,
          action: "retention_delete",
          targetType: "Submission",
          targetId: id,
          metaJson: { strategy: "hard", reason: "retention_expired" },
        },
      });
    }
    await tx.submission.deleteMany({ where: { id: { in: ids } } });
  });

  return { deleted: ids.length };
}

export async function POST(req: Request) {
  const authz = req.headers.get("authorization") || req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return unauthorized();
  if (!authz || !authz.startsWith("Bearer ") || authz.slice(7) !== secret) return unauthorized();

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 500) || 500;

  try {
    const result = await runOnce(limit);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("retention job error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
