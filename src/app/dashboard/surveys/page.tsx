import Link from "next/link";
import { requireUserId } from "@/lib/rbac";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function DashboardSurveysPage() {
  const userId = await requireUserId();

  const surveys = await prisma.survey.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { submissions: true, versions: true } },
    },
  });

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your surveys</h1>
        <Button asChild>
          <Link href="/surveys/new">New survey</Link>
        </Button>
      </div>

      {surveys.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-gray-600">No surveys yet. Create your first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {surveys.map((s: any) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-sm text-gray-600">/{s.slug}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={s.status === 'published' ? 'default' : s.status === 'archived' ? 'outline' : 'secondary'}>
                      {s.status}
                    </Badge>
                    <Badge variant="secondary">{s._count.versions} versions</Badge>
                    <Badge variant="secondary">{s._count.submissions} submissions</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/surveys/${s.id}`}>Results</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/surveys/${s.id}/builder`}>Builder</Link>
                  </Button>
                  {s.status === 'published' ? (
                    <Button asChild variant="link" size="sm">
                      <Link href={`/s/${s.slug}`}>Public</Link>
                    </Button>
                  ) : (
                    <Badge variant="outline" className="opacity-60">Public</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
