import prisma from "@/lib/db";

type JSONValue = string | number | boolean | null | { [k: string]: JSONValue } | JSONValue[];

export async function auditLog({
  actorId,
  action,
  targetType,
  targetId,
  meta,
}: {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  meta?: JSONValue;
}) {
  const data: Record<string, unknown> = {
    actorId: actorId ?? null,
    action,
    targetType,
    targetId,
  };
  if (typeof meta !== "undefined" && meta !== null) {
    data.metaJson = meta as unknown as object;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.auditLog.create({ data: data as any });
}
