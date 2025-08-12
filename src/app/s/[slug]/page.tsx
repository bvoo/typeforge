import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import PublicSurveyForm, { type Field } from "@/components/PublicSurveyForm";
import { Card, CardContent } from "@/components/ui/card";

export const revalidate = 0; // always fresh

export default async function PublicSurveyPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const survey = await prisma.survey.findUnique({
    where: { slug: params.slug },
    include: { currentVersion: true },
  });
  if (!survey || survey.status !== "published" || !survey.currentVersion) notFound();

  const schema: unknown = survey.currentVersion.schemaJson;
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
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{survey.title}</h1>
      {fields.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-gray-600">This survey has no questions.</p>
          </CardContent>
        </Card>
      ) : (
        <PublicSurveyForm slug={survey.slug} fields={fields} />
      )}
    </main>
  );
}
