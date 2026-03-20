"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Generation = {
  id: string;
  type: string;
  locale: string | null;
  model: string;
  content: Record<string, unknown>;
  generatedAt: string;
};

type Props = {
  generation: Generation;
  onSaved: () => Promise<void>;
};

export function GenerationEditorCard({ generation, onSaved }: Props) {
  const initialText = useMemo(() => JSON.stringify(generation.content, null, 2), [generation.content]);
  const [contentText, setContentText] = useState(initialText);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setError(null);
    setSaved(false);
    setIsSaving(true);

    try {
      const parsed = JSON.parse(contentText) as Record<string, unknown>;

      const response = await fetch(`/api/generate/${generation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: parsed }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "Failed to save content");
      }

      await onSaved();
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save content");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{generation.type.replaceAll("_", " ")}</CardTitle>
        <CardDescription>
          {generation.locale ? `Locale: ${generation.locale} | ` : ""}
          Model: {generation.model} | {new Date(generation.generatedAt).toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea value={contentText} onChange={(event) => setContentText(event.target.value)} className="min-h-56 font-mono text-xs" />
        <div className="flex items-center gap-3">
          <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Edits"}
          </Button>
          {saved ? <span className="text-xs text-green-600">Saved</span> : null}
          {error ? <span className="text-xs text-red-600">{error}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
