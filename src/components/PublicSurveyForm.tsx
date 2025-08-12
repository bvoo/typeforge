"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type Field = {
  id: string;
  label: string;
  type: "text" | "long_text" | "number" | "boolean" | "select";
  required?: boolean;
  options?: string[]; // for select
};

export default function PublicSurveyForm({ slug, fields, readOnly }: { slug: string; fields: Field[]; readOnly?: boolean }) {
  const [answers, setAnswers] = useState<Record<string, string | number | boolean | null>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch(`/api/submissions/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit", // ensure no cookies sent
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Submission failed");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  };

  const update = (id: string, value: string | number | boolean | null) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  if (status === "success") {
    return (
      <Alert>
        <AlertDescription>Thanks! Your response has been recorded.</AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {fields.map((f) => (
        <div key={f.id} className="space-y-2">
          <Label htmlFor={f.id} className="text-sm font-medium">
            {f.label}
            {f.required ? " *" : ""}
          </Label>
          {f.type === "text" && (
            <Input
              id={f.id}
              required={!!f.required}
              disabled={!!readOnly}
              onChange={(e) => update(f.id, e.target.value)}
            />
          )}
          {f.type === "long_text" && (
            <Textarea
              id={f.id}
              required={!!f.required}
              disabled={!!readOnly}
              onChange={(e) => update(f.id, e.target.value)}
            />
          )}
          {f.type === "number" && (
            <Input
              id={f.id}
              type="number"
              required={!!f.required}
              disabled={!!readOnly}
              onChange={(e) =>
                update(f.id, e.target.value === "" ? null : Number(e.target.value))
              }
            />
          )}
          {f.type === "boolean" && (
            <Checkbox
              id={f.id}
              disabled={!!readOnly}
              onCheckedChange={(checked) => update(f.id, checked === true)}
            />
          )}
          {f.type === "select" && (
            <Select onValueChange={(val) => update(f.id, val)}>
              <SelectTrigger id={f.id} disabled={!!readOnly}>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {(f.options || []).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ))}
      {status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{error ?? "Submission failed"}</AlertDescription>
        </Alert>
      )}
      {!readOnly && (
        <Button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Submitting..." : "Submit"}
        </Button>
      )}
    </form>
  );
}
