import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { publishSurvey, archiveSurvey, unarchiveSurvey, unpublishSurvey } from "../../actions";
import { requireSurveyOwner } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import BuilderEditor from "@/components/BuilderEditor";
import type { Field } from "@/components/PublicSurveyForm";

export default async function BuilderPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { survey: base } = await requireSurveyOwner(params.id);

  const survey = await prisma.survey.findUnique({
    where: { id: base.id },
    include: {
      versions: { orderBy: { version: "desc" }, take: 10 },
      currentVersion: true,
    },
  });
  if (!survey) notFound();

  const initialFields: Field[] = (
    Array.isArray((survey.currentVersion?.schemaJson as { fields?: unknown[] } | undefined)?.fields)
      ? ((survey.currentVersion!.schemaJson as { fields: unknown[] }).fields)
      : []
  ).map((f) => {
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

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Builder · {survey.title}</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="link">
            <Link href="/dashboard/surveys">Back</Link>
          </Button>
          {survey.currentVersion && (
            <Button asChild variant="link">
              <Link href={`/surveys/${survey.id}/preview`}>Preview</Link>
            </Button>
          )}
          {survey.status === "published" ? (
            <Button asChild variant="link">
              <Link href={`/s/${survey.slug}`}>Public</Link>
            </Button>
          ) : (
            <Badge variant="secondary" className="opacity-60">Public</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Status: {survey.status}</Badge>
        {survey.status === "published" && (
          <form action={unpublishSurvey}>
            <input type="hidden" name="surveyId" value={survey.id} />
            <Button type="submit" variant="outline" size="sm">Set to Draft</Button>
          </form>
        )}
        {survey.status === "archived" ? (
          <form action={unarchiveSurvey}>
            <input type="hidden" name="surveyId" value={survey.id} />
            <Button type="submit" variant="outline" size="sm">Unarchive</Button>
          </form>
        ) : (
          <form action={archiveSurvey}>
            <input type="hidden" name="surveyId" value={survey.id} />
            <Button type="submit" variant="outline" size="sm">Archive</Button>
          </form>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Builder</h2>
        <BuilderEditor
          surveyId={survey.id}
          onPublish={publishSurvey}
          disabled={survey.status === "archived"}
          initialFields={initialFields}
        />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Versions</h2>
        <div className="space-y-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {survey.versions.map((v: any) => (
            <Card key={v.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    v{v.version}{v.isCurrent ? " · current" : ""}
                  </div>
                  <div className="text-xs text-gray-600">
                    {v.publishedAt ? new Date(v.publishedAt).toLocaleString() : "(unpublished)"}
                  </div>
                </div>
                <Button asChild variant="link" size="sm">
                  <Link href={`/surveys/${survey.id}/preview`}>Preview</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
