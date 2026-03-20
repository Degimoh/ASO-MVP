"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const platformOptions = [
  { value: "IOS", label: "iOS" },
  { value: "ANDROID", label: "Android" },
  { value: "CROSS_PLATFORM", label: "Cross Platform" },
] as const;

const localeOptions = [
  "en-US",
  "en-GB",
  "es-ES",
  "fr-FR",
  "de-DE",
  "pt-BR",
  "it-IT",
  "ja-JP",
  "ko-KR",
  "zh-CN",
] as const;

const formSchema = z.object({
  appName: z.string().trim().min(1, "App name is required"),
  platform: z.enum(["IOS", "ANDROID", "CROSS_PLATFORM"]),
  category: z.string().trim().min(1, "Category is required"),
  appSummary: z.string().trim().min(1, "App summary is required"),
  coreFeatures: z
    .array(
      z.object({
        value: z.string().trim().min(1, "Feature cannot be empty"),
      }),
    )
    .min(1, "Add at least one core feature"),
  targetAudience: z.string().trim().min(1, "Target audience is required"),
  toneOfVoice: z.string().trim().min(1, "Tone of voice is required"),
  primaryLanguage: z.string().trim().min(1, "Primary language is required"),
  targetLocales: z.array(z.string().trim()).min(1, "Select at least one locale"),
  competitors: z.string().optional(),
  importantKeywords: z.string().optional(),
});

type CreateProjectFormValues = z.infer<typeof formSchema>;

function parseList(value: string | undefined): string[] {
  if (!value) return [];

  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function CreateProjectRHFForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      appName: "",
      platform: "IOS",
      category: "",
      appSummary: "",
      coreFeatures: [{ value: "" }],
      targetAudience: "",
      toneOfVoice: "",
      primaryLanguage: "English",
      targetLocales: ["en-US"],
      competitors: "",
      importantKeywords: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "coreFeatures",
  });

  const selectedLocales = form.watch("targetLocales");

  const isSubmitting = form.formState.isSubmitting;

  const localeSet = useMemo(() => new Set(selectedLocales), [selectedLocales]);

  async function onSubmit(values: CreateProjectFormValues) {
    setSubmitError(null);

    const payload = {
      appName: values.appName.trim(),
      platform: values.platform,
      category: values.category.trim(),
      appSummary: values.appSummary.trim(),
      coreFeatures: values.coreFeatures.map((feature) => feature.value.trim()).filter(Boolean),
      targetAudience: values.targetAudience.trim(),
      toneOfVoice: values.toneOfVoice.trim(),
      primaryLanguage: values.primaryLanguage.trim(),
      targetLocales: values.targetLocales,
      competitors: parseList(values.competitors),
      importantKeywords: parseList(values.importantKeywords),
    };

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as { error?: string; data?: { id?: string } };

      if (!response.ok || !body.data?.id) {
        throw new Error(body.error || "Failed to create project");
      }

      router.push(`/dashboard/projects/${body.data.id}`);
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create project");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Details</CardTitle>
        <CardDescription>
          Define your app context. Required fields are validated before project creation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="appName">App name</Label>
            <Input id="appName" {...form.register("appName")} placeholder="Habit Flow" />
            {form.formState.errors.appName ? (
              <p className="text-xs text-red-600">{form.formState.errors.appName.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={form.watch("platform")} onValueChange={(value) => form.setValue("platform", value as CreateProjectFormValues["platform"], { shouldValidate: true })}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {platformOptions.map((platform) => (
                  <SelectItem key={platform.value} value={platform.value}>
                    {platform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.platform ? (
              <p className="text-xs text-red-600">{form.formState.errors.platform.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" {...form.register("category")} placeholder="Productivity" />
            {form.formState.errors.category ? (
              <p className="text-xs text-red-600">{form.formState.errors.category.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryLanguage">Primary language</Label>
            <Input id="primaryLanguage" {...form.register("primaryLanguage")} placeholder="English" />
            {form.formState.errors.primaryLanguage ? (
              <p className="text-xs text-red-600">{form.formState.errors.primaryLanguage.message}</p>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="appSummary">App summary</Label>
            <Textarea
              id="appSummary"
              {...form.register("appSummary")}
              placeholder="Summarize the app value proposition and outcomes."
            />
            {form.formState.errors.appSummary ? (
              <p className="text-xs text-red-600">{form.formState.errors.appSummary.message}</p>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label>Core features</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ value: "" })}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add feature
              </Button>
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Input
                    {...form.register(`coreFeatures.${index}.value`)}
                    placeholder={`Feature ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    aria-label={`Remove feature ${index + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            {form.formState.errors.coreFeatures ? (
              <p className="text-xs text-red-600">
                {form.formState.errors.coreFeatures.message ||
                  form.formState.errors.coreFeatures.root?.message ||
                  "Please review feature inputs"}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="targetAudience">Target audience</Label>
            <Textarea
              id="targetAudience"
              {...form.register("targetAudience")}
              placeholder="Who should install this app and why?"
            />
            {form.formState.errors.targetAudience ? (
              <p className="text-xs text-red-600">{form.formState.errors.targetAudience.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="toneOfVoice">Tone of voice</Label>
            <Input id="toneOfVoice" {...form.register("toneOfVoice")} placeholder="Confident and friendly" />
            {form.formState.errors.toneOfVoice ? (
              <p className="text-xs text-red-600">{form.formState.errors.toneOfVoice.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Target locales</Label>
            <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-200 p-3 text-sm sm:grid-cols-3">
              {localeOptions.map((locale) => {
                const checked = localeSet.has(locale);
                return (
                  <label key={locale} className="flex cursor-pointer items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={checked}
                      onChange={(event) => {
                        const current = form.getValues("targetLocales");
                        const next = event.target.checked
                          ? [...current, locale]
                          : current.filter((value) => value !== locale);

                        form.setValue("targetLocales", next, { shouldValidate: true });
                      }}
                    />
                    <span>{locale}</span>
                  </label>
                );
              })}
            </div>
            {form.formState.errors.targetLocales ? (
              <p className="text-xs text-red-600">{form.formState.errors.targetLocales.message}</p>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="competitors">Competitors</Label>
            <Textarea
              id="competitors"
              {...form.register("competitors")}
              placeholder="Comma or line-separated (e.g. Habitica, Streaks)"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="importantKeywords">Important keywords</Label>
            <Textarea
              id="importantKeywords"
              {...form.register("importantKeywords")}
              placeholder="Comma or line-separated keywords"
            />
          </div>

          <div className="md:col-span-2 space-y-3">
            {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating project..." : "Create Project"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
