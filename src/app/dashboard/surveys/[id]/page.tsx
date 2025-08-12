import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { decryptJSON, type EncryptedBlob } from "@/lib/crypto";
import { requireSurveyOwner } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Field } from "@/components/PublicSurveyForm";

export default async function SurveyResultsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { survey: base } = await requireSurveyOwner(params.id);

  const survey = await prisma.survey.findUnique({
    where: { id: base.id },
    include: {
      currentVersion: true,
      _count: { select: { submissions: true } },
    },
  });
  if (!survey) notFound();

  const submissions = await prisma.submission.findMany({
    where: { surveyId: survey.id },
    orderBy: { submittedAt: "desc" },
    take: 50,
    include: { secure: true, version: true },
  });

  const rows = submissions.map((s) => {
    try {
      const sec = s.secure;
      let answers: Record<string, unknown> = {};
      if (sec) {
        const blob: EncryptedBlob = {
          keyId: sec.keyId,
          iv: Buffer.from(sec.iv),
          authTag: Buffer.from(sec.authTag),
          ciphertext: Buffer.from(sec.ciphertext),
        };
        const payload = decryptJSON(blob) as { answers?: Record<string, unknown> };
        answers = payload?.answers ?? {};
      }
      const schema: unknown = s.version.schemaJson as unknown;
      const fieldsRaw: unknown[] =
        schema && typeof schema === "object" && Array.isArray((schema as { fields?: unknown[] }).fields)
          ? ((schema as { fields: unknown[] }).fields)
          : [];
      const fields: Field[] = fieldsRaw.map((f) => {
        const o = f as Record<string, unknown>;
        const typeVal = o.type as unknown;
        const type: Field["type"] =
          typeVal === "long_text" || typeVal === "number" || typeVal === "boolean" || typeVal === "select"
            ? (typeVal as Field["type"]) : "text";
        return {
          id: String(o.id ?? ""),
          label: String(o.label ?? "Untitled"),
          type,
          required: Boolean(o.required ?? false),
          options: Array.isArray(o.options) ? (o.options as unknown[]).map((x) => String(x)) : undefined,
        };
      });

      return { id: s.id, submittedAt: s.submittedAt, version: s.version.version, fields, answers };
    } catch (e) {
      console.error("decrypt_failed", e);
      return { id: s.id, submittedAt: s.submittedAt, version: s.version.version, fields: [] as Field[], answers: { error: "decrypt_failed" } };
    }
  });

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Results · {survey.title}</h1>
          <div className="mt-1">
            <Badge variant="secondary">{survey._count.submissions} submissions</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="link"><Link href={`/surveys/${survey.id}/builder`}>Builder</Link></Button>
          <Button asChild variant="link"><Link href={`/surveys/${survey.id}/preview`}>Preview</Link></Button>
          <Button asChild variant="link"><Link href={`/s/${survey.slug}`}>Public</Link></Button>
          <Button asChild variant="link"><Link href={`/api/exports/surveys/${survey.id}`}>Export CSV</Link></Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-gray-600">No submissions yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-2">
                <div className="text-sm text-gray-600">v{r.version} · {new Date(r.submittedAt).toLocaleString()}</div>
                {"error" in r.answers ? (
                  <p className="text-sm text-red-600">decrypt_failed</p>
                ) : r.fields.length === 0 ? (
                  <p className="text-sm text-gray-600">No fields for this version.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Question</TableHead>
                        <TableHead>Answer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {r.fields.map((f) => {
                        const v = r.answers[f.id];
                        let display: string = "";
                        if (typeof v === "boolean") display = v ? "Yes" : "No";
                        else if (v == null) display = "—";
                        else if (typeof v === "object") display = JSON.stringify(v);
                        else display = String(v);
                        return (
                          <TableRow key={f.id}>
                            <TableCell className="font-medium whitespace-normal">{f.label}</TableCell>
                            <TableCell className="whitespace-normal">{display}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
