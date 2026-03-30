"use client";

import { Download, Loader2, RefreshCcw, Trash2, Upload, WandSparkles } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
  fileUrl: string;
  createdAt: string;
};

type GeneratedCreative = {
  id: string;
  screenshotId: string;
  screenshotFileUrl: string;
  headline: string | null;
  subheadline: string | null;
  fileUrl: string | null;
  width: number;
  height: number;
  generatedAt: string;
};

type RegenerateApiSuccess = {
  data: {
    id: string;
    screenshotId: string;
    screenshotFileUrl: string;
    headline: string | null;
    subheadline: string | null;
    fileUrl: string | null;
    width: number;
    height: number;
    generatedAt: string;
    creditsCharged: number;
    walletBalanceAfter: number;
  };
};

type ApiErrorBody = {
  error?: string;
  details?: string;
  code?: string;
  requiredCredits?: number;
  availableCredits?: number;
};

function buildApiErrorMessage(body: ApiErrorBody, fallback: string) {
  if (body.code === "MIGRATION_REQUIRED") {
    return `${body.error || "Database migration required"}. ${body.details || ""}`.trim();
  }

  return body.error || body.details || fallback;
}

type Props = {
  projectId: string;
  initialWalletBalance: number;
  creditsPerImage: number;
  screenshotCreativeModelLabel: string;
  onWalletBalanceChange?: (nextBalance: number) => void;
};

export function ScreenshotCreativesPanel({
  projectId,
  initialWalletBalance,
  creditsPerImage,
  screenshotCreativeModelLabel,
  onWalletBalanceChange,
}: Props) {
  const [walletBalance, setWalletBalance] = useState(initialWalletBalance);
  const [screenshots, setScreenshots] = useState<UploadedScreenshot[]>([]);
  const [creatives, setCreatives] = useState<GeneratedCreative[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [replacingScreenshotId, setReplacingScreenshotId] = useState<string | null>(null);
  const [deletingScreenshotId, setDeletingScreenshotId] = useState<string | null>(null);
  const [regeneratingScreenshotId, setRegeneratingScreenshotId] = useState<string | null>(null);
  const [isExportingZip, setIsExportingZip] = useState(false);
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
      const uploadedItems: UploadedScreenshot[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("files", file);

        const response = await fetch(`/api/projects/${projectId}/screenshots`, {
          method: "POST",
          body: formData,
        });
        const body = (await response.json()) as ApiErrorBody & {
          data?: UploadedScreenshot[];
        };

        if (!response.ok || !body.data) {
          throw new Error(buildApiErrorMessage(body, `Failed to upload ${file.name}`));
        }

        uploadedItems.push(...body.data);
      }

      setScreenshots((prev) => {
        const merged = [...uploadedItems, ...prev];
        return merged;
      });
      setSelectedIds((prev) => [...new Set([...prev, ...uploadedItems.map((item) => item.id)])]);
      setNotice(`Uploaded ${uploadedItems.length} screenshot(s).`);
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
      const generationData = body.data;

      setCreatives((prev) => [...generationData.items, ...prev]);
      setWalletBalance(generationData.walletBalanceAfter);
      onWalletBalanceChange?.(generationData.walletBalanceAfter);
      setNotice(
        `Generated ${generationData.generatedCount} creative image(s), charged ${generationData.creditsCharged} credits.`,
      );
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Failed to generate creatives");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDeleteScreenshot(screenshotId: string) {
    setDeletingScreenshotId(screenshotId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/screenshots`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenshotId }),
      });
      const body = (await response.json()) as ApiErrorBody & {
        data?: { screenshotId: string; deleted: boolean };
      };
      if (!response.ok || !body.data?.deleted) {
        throw new Error(body.error || body.details || "Failed to delete screenshot");
      }

      setScreenshots((prev) => prev.filter((item) => item.id !== screenshotId));
      setSelectedIds((prev) => prev.filter((item) => item !== screenshotId));
      setCreatives((prev) => prev.filter((item) => item.screenshotId !== screenshotId));
      setNotice("Screenshot deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete screenshot");
    } finally {
      setDeletingScreenshotId(null);
    }
  }

  async function handleReplaceScreenshot(screenshotId: string, file: File) {
    setReplacingScreenshotId(screenshotId);
    setError(null);
    setNotice(null);
    try {
      const formData = new FormData();
      formData.append("screenshotId", screenshotId);
      formData.append("file", file);

      const response = await fetch(`/api/projects/${projectId}/screenshots`, {
        method: "PUT",
        body: formData,
      });
      const body = (await response.json()) as ApiErrorBody & {
        data?: UploadedScreenshot;
      };
      if (!response.ok || !body.data) {
        throw new Error(body.error || body.details || "Failed to replace screenshot");
      }
      const replaced = body.data;

      setScreenshots((prev) => [replaced, ...prev.filter((item) => item.id !== screenshotId)]);
      setSelectedIds((prev) => {
        const withoutOld = prev.filter((id) => id !== screenshotId);
        return [...new Set([replaced.id, ...withoutOld])];
      });
      setCreatives((prev) => prev.filter((item) => item.screenshotId !== screenshotId));
      setNotice("Screenshot replaced.");
    } catch (replaceError) {
      setError(replaceError instanceof Error ? replaceError.message : "Failed to replace screenshot");
    } finally {
      setReplacingScreenshotId(null);
    }
  }

  async function handleRegenerateOne(screenshotId: string) {
    setRegeneratingScreenshotId(screenshotId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/screenshot-creatives/${screenshotId}/regenerate`,
        { method: "POST" },
      );
      const body = (await response.json()) as RegenerateApiSuccess & ApiErrorBody;
      if (!response.ok || !body.data) {
        if (body.code === "INSUFFICIENT_CREDITS") {
          throw new Error(
            body.details ||
              `Insufficient credits. Need ${body.requiredCredits ?? "?"}, available ${body.availableCredits ?? "?"}.`,
          );
        }
        throw new Error(body.error || body.details || "Failed to regenerate selected creative");
      }

      const item = body.data;
      setCreatives((prev) => [item, ...prev]);
      setWalletBalance(item.walletBalanceAfter);
      onWalletBalanceChange?.(item.walletBalanceAfter);
      setNotice(`Regenerated creative for selected screenshot. Charged ${item.creditsCharged} credits.`);
    } catch (regenError) {
      setError(regenError instanceof Error ? regenError.message : "Failed to regenerate selected creative");
    } finally {
      setRegeneratingScreenshotId(null);
    }
  }

  async function handleExportZip() {
    setIsExportingZip(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/screenshot-creatives/export`);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
        throw new Error(body.error || body.details || "Failed to export ZIP");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `project-${projectId}-screenshot-creatives.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setNotice("ZIP export started.");
    } catch (zipError) {
      setError(zipError instanceof Error ? zipError.message : "Failed to export ZIP");
    } finally {
      setIsExportingZip(false);
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Screenshot Creative Generator</CardTitle>
          <span className="inline-flex items-center rounded-full border border-lime-300/70 bg-lime-100/80 px-2.5 py-0.5 text-xs font-semibold text-lime-900">
            Model: {screenshotCreativeModelLabel}
          </span>
        </div>
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
            disabled={
              isLoading ||
              isUploading ||
              isGenerating ||
              isExportingZip ||
              replacingScreenshotId !== null ||
              deletingScreenshotId !== null ||
              regeneratingScreenshotId !== null ||
              selectedIds.length === 0 ||
              !canAfford
            }
            title={`Cost: ${creditsPerImage} credits per image. Selected: ${selectedScreenshots.length}.`}
          >
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
            {isGenerating ? "Generating..." : "Generate Creative Images"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleExportZip}
            disabled={isLoading || isUploading || isGenerating || isExportingZip || creatives.length === 0}
          >
            {isExportingZip ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {isExportingZip ? "Exporting..." : "Export All PNG (ZIP)"}
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
                      disabled={
                        isUploading ||
                        isGenerating ||
                        replacingScreenshotId === screenshot.id ||
                        deletingScreenshotId === screenshot.id ||
                        regeneratingScreenshotId === screenshot.id
                      }
                    />
                    <span className="line-clamp-1">{screenshot.originalFilename}</span>
                  </label>

                  <Image
                    src={`/api/projects/${projectId}/screenshots/${screenshot.id}/file`}
                    alt={screenshot.originalFilename}
                    width={640}
                    height={352}
                    className="h-44 w-full rounded border object-cover"
                    unoptimized
                  />

                  <div className="mt-2 text-xs text-slate-600">
                    {screenshot.width ?? "?"}x{screenshot.height ?? "?"} · {Math.round(screenshot.sizeBytes / 1024)} KB
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
                      {replacingScreenshotId === screenshot.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Replace
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          void handleReplaceScreenshot(screenshot.id, file);
                          event.currentTarget.value = "";
                        }}
                        disabled={
                          isUploading ||
                          isGenerating ||
                          replacingScreenshotId !== null ||
                          deletingScreenshotId !== null ||
                          regeneratingScreenshotId !== null
                        }
                      />
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => void handleRegenerateOne(screenshot.id)}
                      disabled={
                        isUploading ||
                        isGenerating ||
                        replacingScreenshotId !== null ||
                        deletingScreenshotId !== null ||
                        regeneratingScreenshotId !== null ||
                        walletBalance < creditsPerImage
                      }
                      title={`Regenerate only this screenshot creative. Cost: ${creditsPerImage} credits.`}
                    >
                      {regeneratingScreenshotId === screenshot.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Regenerate
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs text-red-700 hover:text-red-700"
                      onClick={() => void handleDeleteScreenshot(screenshot.id)}
                      disabled={
                        isUploading ||
                        isGenerating ||
                        replacingScreenshotId !== null ||
                        deletingScreenshotId !== null ||
                        regeneratingScreenshotId !== null
                      }
                    >
                      {deletingScreenshotId === screenshot.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Delete
                    </Button>
                  </div>

                  {latestCreative?.fileUrl ? (
                    <div className="mt-3 space-y-1 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs">
                      <p className="font-medium text-emerald-800">Latest generated creative</p>
                      <p className="line-clamp-2 text-emerald-900">{latestCreative.headline}</p>
                      <a
                        href={latestCreative.fileUrl}
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
