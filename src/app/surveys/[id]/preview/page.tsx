import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSurveyOwner } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PublicSurveyForm, { type Field } from "@/components/PublicSurveyForm";

export default async function PreviewPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { survey: base } = await requireSurveyOwner(params.id);

  const survey = await prisma.survey.findUnique({
    where: { id: base.id },
    include: {
      currentVersion: true,
    },
  });
  if (!survey) notFound();

  // Parse fields from schemaJson if present
  const schema: unknown = survey.currentVersion?.schemaJson;
  const fieldsArr: unknown[] =
    schema && typeof schema === "object" && Array.isArray((schema as { fields?: unknown[] }).fields)
      ? ((schema as { fields: unknown[] }).fields)
      : [];
  const fields: Field[] = fieldsArr.map((f) => {
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
        <h1 className="text-2xl font-semibold">Preview · {survey.title}</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="link">
            <Link href={`/surveys/${survey.id}/builder`}>Builder</Link>
          </Button>
          <Button asChild variant="link">
            <Link href={`/s/${survey.slug}`}>Public</Link>
          </Button>
        </div>
      </div>
      {!survey.currentVersion || fields.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-gray-600">No questions to preview yet.</p>
          </CardContent>
        </Card>
      ) : (
        <PublicSurveyForm slug={survey.slug} fields={fields} readOnly />
      )}
    </main>
  );
}
