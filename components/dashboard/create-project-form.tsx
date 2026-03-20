"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlatformOption } from "@/lib/constants";
import { PLATFORM_OPTIONS } from "@/lib/constants";
import { splitCommaSeparated } from "@/lib/utils";

const initialState = {
  appName: "",
  platform: "IOS" as PlatformOption,
  category: "",
  appSummary: "",
  coreFeatures: "",
  targetAudience: "",
  toneOfVoice: "",
  primaryLanguage: "English",
  targetLocales: "en-US",
  competitors: "",
  importantKeywords: "",
};

type Props = {
  onCreated: () => Promise<void>;
};

export function CreateProjectForm({ onCreated }: Props) {
  const [form, setForm] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload = {
      appName: form.appName,
      platform: form.platform,
      category: form.category,
      appSummary: form.appSummary,
      coreFeatures: splitCommaSeparated(form.coreFeatures),
      targetAudience: form.targetAudience,
      toneOfVoice: form.toneOfVoice,
      primaryLanguage: form.primaryLanguage,
      targetLocales: splitCommaSeparated(form.targetLocales),
      competitors: splitCommaSeparated(form.competitors),
      importantKeywords: splitCommaSeparated(form.importantKeywords),
    };

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "Failed to create project");
      }

      setForm(initialState);
      await onCreated();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Project</CardTitle>
        <CardDescription>Enter your app inputs and generate ASO assets in one workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="appName">App Name</Label>
            <Input
              id="appName"
              value={form.appName}
              onChange={(event) => setForm((prev) => ({ ...prev, appName: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Platform</Label>
            <Select
              value={form.platform}
              onValueChange={(value) => setForm((prev) => ({ ...prev, platform: value as PlatformOption }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {platform === "CROSS_PLATFORM" ? "Cross Platform" : platform}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="toneOfVoice">Tone of Voice</Label>
            <Input
              id="toneOfVoice"
              value={form.toneOfVoice}
              onChange={(event) => setForm((prev) => ({ ...prev, toneOfVoice: event.target.value }))}
              placeholder="Professional, playful, confident..."
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="appSummary">App Summary</Label>
            <Textarea
              id="appSummary"
              value={form.appSummary}
              onChange={(event) => setForm((prev) => ({ ...prev, appSummary: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="coreFeatures">Core Features (comma-separated)</Label>
            <Input
              id="coreFeatures"
              value={form.coreFeatures}
              onChange={(event) => setForm((prev) => ({ ...prev, coreFeatures: event.target.value }))}
              placeholder="Smart reminders, AI suggestions, Team collaboration"
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Textarea
              id="targetAudience"
              value={form.targetAudience}
              onChange={(event) => setForm((prev) => ({ ...prev, targetAudience: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryLanguage">Primary Language</Label>
            <Input
              id="primaryLanguage"
              value={form.primaryLanguage}
              onChange={(event) => setForm((prev) => ({ ...prev, primaryLanguage: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetLocales">Target Locales (comma-separated)</Label>
            <Input
              id="targetLocales"
              value={form.targetLocales}
              onChange={(event) => setForm((prev) => ({ ...prev, targetLocales: event.target.value }))}
              placeholder="en-US, es-ES, fr-FR"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="competitors">Competitors (comma-separated)</Label>
            <Input
              id="competitors"
              value={form.competitors}
              onChange={(event) => setForm((prev) => ({ ...prev, competitors: event.target.value }))}
              placeholder="Competitor A, Competitor B"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="importantKeywords">Important Keywords (comma-separated)</Label>
            <Input
              id="importantKeywords"
              value={form.importantKeywords}
              onChange={(event) => setForm((prev) => ({ ...prev, importantKeywords: event.target.value }))}
              placeholder="habit tracker, productivity app"
            />
          </div>

          <div className="md:col-span-2">
            {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
