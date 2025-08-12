import Link from "next/link";
import { createSurvey } from "../actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function NewSurveyPage() {
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Create a new survey</h1>
      <form action={createSurvey} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title" className="block text-sm font-medium">Title</Label>
          <Input
            id="title"
            name="title"
            type="text"
            required
            placeholder="Customer Feedback 2025"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug" className="block text-sm font-medium">Slug</Label>
          <Input
            id="slug"
            name="slug"
            type="text"
            required
            placeholder="customer-feedback-2025"
            pattern="[a-z0-9-]+"
          />
          <p className="text-xs text-gray-500">Lowercase letters, numbers, and dashes only.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="retentionDays" className="block text-sm font-medium">Retention (days)</Label>
          <Input
            id="retentionDays"
            name="retentionDays"
            type="number"
            min={1}
            max={3650}
            defaultValue={365}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit">Create</Button>
          <Button asChild variant="link" size="sm">
            <Link href="/dashboard/surveys">Back to surveys</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}
