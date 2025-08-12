"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { Field } from "@/components/PublicSurveyForm";

function slugifyId(v: string) {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Props = {
  surveyId: string;
  initialFields?: Field[];
  onPublish: (formData: FormData) => void | Promise<void>;
  disabled?: boolean;
};

export default function BuilderEditor({ surveyId, initialFields = [], onPublish, disabled }: Props) {
  const [fields, setFields] = useState<Field[]>(initialFields);

  const addField = () => {
    const idx = fields.length + 1;
    setFields((prev) => [
      ...prev,
      { id: slugifyId(`q${idx}`), label: `Question ${idx}`, type: "text", required: false },
    ]);
  };
  const removeField = (i: number) => setFields((prev) => prev.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    setFields((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      const [item] = next.splice(i, 1);
      next.splice(j, 0, item);
      return next;
    });
  };
  const updateField = (i: number, patch: Partial<Field>) => {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  };

  const schemaString = useMemo(() => {
    const clean = fields.map((f) => ({
      id: slugifyId(f.id || ""),
      label: f.label?.trim() || "Untitled",
      type: f.type,
      required: !!f.required,
      options: f.type === "select" ? (f.options || []).filter(Boolean) : undefined,
    }));
    return JSON.stringify({ fields: clean });
  }, [fields]);

  const canPublish = fields.length > 0 && fields.every((f) => f.id && f.label);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Build questions</h3>
        <Button type="button" variant="outline" onClick={addField} disabled={disabled}>Add question</Button>
      </div>

      <div className="space-y-3">
        {fields.map((f, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor={`label-${i}`}>Label</Label>
                  <Input
                    id={`label-${i}`}
                    value={f.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                    placeholder="e.g. Your feedback"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`id-${i}`}>Field id</Label>
                  <Input
                    id={`id-${i}`}
                    value={f.id}
                    onChange={(e) => updateField(i, { id: slugifyId(e.target.value) })}
                    placeholder="e.g. q1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={f.type} onValueChange={(val) => updateField(i, { type: val as Field["type"] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Short text</SelectItem>
                      <SelectItem value="long_text">Long text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="boolean">Checkbox</SelectItem>
                      <SelectItem value="select">Select</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 mt-6 md:mt-8">
                  <Checkbox id={`req-${i}`} checked={!!f.required} onCheckedChange={(c) => updateField(i, { required: c === true })} />
                  <Label htmlFor={`req-${i}`}>Required</Label>
                </div>
              </div>

              {f.type === "select" && (
                <div className="space-y-2">
                  <Label htmlFor={`opts-${i}`}>Options (comma-separated)</Label>
                  <Input
                    id={`opts-${i}`}
                    value={(f.options || []).join(", ")}
                    onChange={(e) =>
                      updateField(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
                    }
                    placeholder="e.g. Red, Green, Blue"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => move(i, -1)} disabled={i === 0}>Up</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => move(i, 1)} disabled={i === fields.length - 1}>Down</Button>
                </div>
                <Button type="button" variant="destructive" size="sm" onClick={() => removeField(i)}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <form action={onPublish} className="space-y-2">
        <input type="hidden" name="surveyId" value={surveyId} />
        <input type="hidden" name="schemaJson" value={schemaString} />
        <div className="text-xs text-muted-foreground">Schema is generated automatically from the questions above.</div>
        <Button type="submit" disabled={!canPublish || !!disabled}>Publish</Button>
      </form>
    </div>
  );
}
