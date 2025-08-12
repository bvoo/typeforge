import { requireSurveyOwner } from "@/lib/rbac";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";
import { decryptJSON, type EncryptedBlob } from "@/lib/crypto";
import { auditLog } from "@/lib/audit";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { userId, survey: base } = await requireSurveyOwner(params.id);

  const submissions = await prisma.submission.findMany({
    where: { surveyId: base.id },
    orderBy: { submittedAt: "asc" },
    include: { secure: true, version: true },
  });

  const keySet = new Set<string>();
  const rows: Array<{ id: string; submittedAt: string; version: number; answers: Record<string, unknown> } > = [];

  for (const s of submissions) {
    let answers: Record<string, unknown> = {};
    try {
      const sec = s.secure;
      if (sec) {
        const blob: EncryptedBlob = {
          keyId: sec.keyId,
          iv: Buffer.from(sec.iv),
          authTag: Buffer.from(sec.authTag),
          ciphertext: Buffer.from(sec.ciphertext),
        };
        const payload = decryptJSON(blob) as { answers?: Record<string, unknown> };
        answers = payload?.answers ?? {};
        Object.keys(answers).forEach((k) => keySet.add(k));
      }
    } catch (e) {
      console.error("export decrypt_failed", e);
      answers = { error: "decrypt_failed" };
      keySet.add("error");
    }
    rows.push({ id: s.id, submittedAt: s.submittedAt.toISOString(), version: s.version.version, answers });
  }

  const keys = Array.from(keySet.values()).sort();
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    const needsWrap = /[",\n]/.test(s);
    const inner = s.replace(/"/g, '""');
    return needsWrap ? `"${inner}"` : inner;
  };

  const header = ["id", "submittedAt", "version", ...keys].join(",");
  const lines = rows.map((r) => {
    const vals = [r.id, r.submittedAt, String(r.version), ...keys.map((k) => escape(r.answers[k]))];
    return vals.join(",");
  });
  const csv = [header, ...lines].join("\n");

  await auditLog({
    actorId: userId,
    action: "survey_export_csv",
    targetType: "Survey",
    targetId: base.id,
    meta: { columns: keys, rowCount: rows.length },
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=survey-${base.slug}-export.csv`,
      "Cache-Control": "no-store",
    },
  });
}
