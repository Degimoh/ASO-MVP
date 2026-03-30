"use client";

import { Loader2, Upload, WandSparkles } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type UploadedScreenshot = {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  storagePath: string;
  createdAt: string;
};

type GeneratedCreative = {
  id: string;
  screenshotId: string;
  screenshotPath: string;
  headline: string | null;
  subheadline: string | null;
  storagePath: string | null;
  width: number;
  height: number;
  generatedAt: string;
};

type ApiErrorBody = {
  error?: string;
  details?: string;
  code?: string;
  requiredCredits?: number;
  availableCredits?: number;
};

type Props = {
  projectId: string;
  initialWalletBalance: number;
  creditsPerImage: number;
  onWalletBalanceChange?: (nextBalance: number) => void;
};

export function ScreenshotCreativesPanel({
  projectId,
  initialWalletBalance,
  creditsPerImage,
  onWalletBalanceChange,
}: Props) {
  const [walletBalance, setWalletBalance] = useState(initialWalletBalance);
  const [screenshots, setScreenshots] = useState<UploadedScreenshot[]>([]);
  const [creatives, setCreatives] = useState<GeneratedCreative[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const [screenshotsRes, creativesRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/screenshots`),
          fetch(`/api/projects/${projectId}/screenshot-creatives`),
        ]);

        const screenshotsBody = (await screenshotsRes.json()) as {
          error?: string;
          data?: UploadedScreenshot[];
        };
        const creativesBody = (await creativesRes.json()) as {
          error?: string;
          data?: GeneratedCreative[];
        };

        if (!screenshotsRes.ok) {
          throw new Error(screenshotsBody.error || "Failed to load screenshots");
        }
        if (!creativesRes.ok) {
          throw new Error(creativesBody.error || "Failed to load generated creatives");
        }

        const loadedScreenshots = screenshotsBody.data ?? [];
        setScreenshots(loadedScreenshots);
        setSelectedIds(loadedScreenshots.map((item) => item.id));
        setCreatives(creativesBody.data ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load screenshot creative data");
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [projectId]);

  function toggleSelection(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  const selectedScreenshots = useMemo(
    () => screenshots.filter((item) => selectedIds.includes(item.id)),
    [screenshots, selectedIds],
  );
  const estimatedCost = selectedScreenshots.length * creditsPerImage;
  const canAfford = walletBalance >= estimatedCost;

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setIsUploading(true);
    setError(null);
    setNotice(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));

      const response = await fetch(`/api/projects/${projectId}/screenshots`, {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as ApiErrorBody & {
        data?: UploadedScreenshot[];
      };

      if (!response.ok || !body.data) {
        throw new Error(body.error || "Failed to upload screenshots");
      }

      setScreenshots((prev) => {
        const merged = [...body.data!, ...prev];
        return merged;
      });
      setSelectedIds((prev) => [...new Set([...prev, ...body.data!.map((item) => item.id)])]);
      setNotice(`Uploaded ${body.data.length} screenshot(s).`);
      event.target.value = "";
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload screenshots");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleGenerate() {
    if (selectedIds.length === 0) {
      setError("Select at least one screenshot.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/screenshot-creatives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screenshotIds: selectedIds,
        }),
      });

      const body = (await response.json()) as {
        data?: {
          items: GeneratedCreative[];
          generatedCount: number;
          walletBalanceAfter: number;
          creditsCharged: number;
        };
      } & ApiErrorBody;

      if (!response.ok || !body.data) {
        if (body.code === "INSUFFICIENT_CREDITS") {
          throw new Error(
            body.details ||
              `Insufficient credits. Need ${body.requiredCredits ?? "?"}, available ${body.availableCredits ?? "?"}.`,
          );
        }
        throw new Error(body.error || body.details || "Failed to generate screenshot creatives");
      }

      setCreatives((prev) => [...body.data.items, ...prev]);
      setWalletBalance(body.data.walletBalanceAfter);
      onWalletBalanceChange?.(body.data.walletBalanceAfter);
      setNotice(
        `Generated ${body.data.generatedCount} creative image(s), charged ${body.data.creditsCharged} credits.`,
      );
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Failed to generate creatives");
    } finally {
      setIsGenerating(false);
    }
  }

  const creativeByScreenshot = useMemo(() => {
    const map = new Map<string, GeneratedCreative>();
    for (const creative of creatives) {
      if (!map.has(creative.screenshotId)) {
        map.set(creative.screenshotId, creative);
      }
    }
    return map;
  }, [creatives]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Screenshot Creative Generator</CardTitle>
        <CardDescription>
          Upload app screenshots and generate Apple Store-ready images (1284x2778) with AI marketing text overlays.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={handleUpload}
            disabled={isUploading || isGenerating}
            className="max-w-sm"
          />
          <div className="inline-flex items-center rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600">
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {isUploading ? "Uploading..." : "Upload screenshots"}
          </div>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading || isUploading || isGenerating || selectedIds.length === 0 || !canAfford}
            title={`Cost: ${creditsPerImage} credits per image. Selected: ${selectedScreenshots.length}.`}
          >
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
            {isGenerating ? "Generating..." : "Generate Creative Images"}
          </Button>
        </div>

        <div className="text-xs text-slate-600">
          Balance: <span className="font-medium text-slate-900">{walletBalance}</span> credits · Selected:{" "}
          <span className="font-medium text-slate-900">{selectedScreenshots.length}</span> · Estimated cost:{" "}
          <span className="font-medium text-slate-900">{estimatedCost}</span> credits
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {notice ? <p className="text-sm text-green-700">{notice}</p> : null}
        {!canAfford && selectedScreenshots.length > 0 ? (
          <p className="text-sm text-amber-700">
            Not enough credits for selected images. Reduce selection or add credits in Settings.
          </p>
        ) : null}

        {isLoading ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Loading screenshots...
          </div>
        ) : screenshots.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No screenshots uploaded yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {screenshots.map((screenshot) => {
              const selected = selectedIds.includes(screenshot.id);
              const latestCreative = creativeByScreenshot.get(screenshot.id);
              return (
                <div
                  key={screenshot.id}
                  className={`rounded-md border p-3 ${
                    selected ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelection(screenshot.id)}
                      disabled={isUploading || isGenerating}
                    />
                    <span className="line-clamp-1">{screenshot.originalFilename}</span>
                  </label>

                  <img
                    src={screenshot.storagePath}
                    alt={screenshot.originalFilename}
                    className="h-44 w-full rounded border object-cover"
                  />

                  <div className="mt-2 text-xs text-slate-600">
                    {screenshot.width ?? "?"}x{screenshot.height ?? "?"} · {Math.round(screenshot.sizeBytes / 1024)} KB
                  </div>

                  {latestCreative?.storagePath ? (
                    <div className="mt-3 space-y-1 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs">
                      <p className="font-medium text-emerald-800">Latest generated creative</p>
                      <p className="line-clamp-2 text-emerald-900">{latestCreative.headline}</p>
                      <a
                        href={latestCreative.storagePath}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-emerald-700 underline"
                      >
                        Open / Download PNG
                      </a>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
