"use client";

import { Copy, RefreshCcw, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type WorkspaceTabType =
  | "DESCRIPTION"
  | "KEYWORDS"
  | "SCREENSHOT_CAPTIONS"
  | "UPDATE_NOTES"
  | "LOCALIZATION";

const workspaceTabs: Array<{ key: WorkspaceTabType; label: string }> = [
  { key: "DESCRIPTION", label: "Description" },
  { key: "KEYWORDS", label: "Keywords" },
  { key: "SCREENSHOT_CAPTIONS", label: "Screenshot Captions" },
  { key: "UPDATE_NOTES", label: "Update Notes" },
  { key: "LOCALIZATION", label: "Localization" },
];

type Props = {
  projectId: string;
  initialContent: Partial<Record<WorkspaceTabType, string>>;
};

type KeywordsContentShape = {
  keywords: string[];
  characterCount: number;
  withinLimit: boolean;
};

function normalizeKeywordSeparators(value: string) {
  return value
    .replace(/[;|\n\r\t]+/g, ",")
    .replace(/[，、]+/g, ",")
    .replace(/,+/g, ",");
}

function tokenizeKeywords(value: string) {
  return normalizeKeywordSeparators(value)
    .split(",")
    .map((keyword) => keyword.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

function dedupeKeywords(keywords: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const keyword of keywords) {
    const normalized = keyword.toLowerCase();

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(keyword);
  }

  return output;
}

function parseKeywordsFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) {
    return dedupeKeywords(
      value
        .filter((item): item is string => typeof item === "string")
        .flatMap((item) => tokenizeKeywords(item)),
    );
  }

  if (typeof value === "string") {
    return dedupeKeywords(tokenizeKeywords(value));
  }

  return [];
}

function parseKeywordsFromDraft(draft: string): string[] {
  const trimmed = draft.trim();

  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "object" && parsed !== null && "keywords" in parsed) {
      return parseKeywordsFromUnknown((parsed as { keywords?: unknown }).keywords);
    }
  } catch {
    // Fall through to raw text parsing.
  }

  return dedupeKeywords(tokenizeKeywords(trimmed));
}

function formatKeywordsForEditor(value: unknown): string {
  return parseKeywordsFromUnknown(value).join(", ");
}

function normalizeInitialKeywords(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "object" && parsed !== null && "keywords" in parsed) {
      return formatKeywordsForEditor((parsed as { keywords?: unknown }).keywords);
    }
  } catch {
    // Keep draft as-is.
  }

  return trimmed;
}

function computeKeywordsMeta(draft: string): KeywordsContentShape {
  const keywords = parseKeywordsFromDraft(draft);
  const characterCount = keywords.join(",").length;

  return {
    keywords,
    characterCount,
    withinLimit: characterCount <= 100,
  };
}

export function ProjectWorkspaceTabs({ projectId, initialContent }: Props) {
  const [activeTab, setActiveTab] = useState<WorkspaceTabType>("DESCRIPTION");
  const [drafts, setDrafts] = useState<Record<WorkspaceTabType, string>>({
    DESCRIPTION: initialContent.DESCRIPTION || "",
    KEYWORDS: normalizeInitialKeywords(initialContent.KEYWORDS),
    SCREENSHOT_CAPTIONS: initialContent.SCREENSHOT_CAPTIONS || "",
    UPDATE_NOTES: initialContent.UPDATE_NOTES || "",
    LOCALIZATION: initialContent.LOCALIZATION || "",
  });
  const [isTabLoading, setIsTabLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [keywordsError, setKeywordsError] = useState<string | null>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTabLoading(false);
    }, 350);

    return () => clearTimeout(timer);
  }, []);

  useEffect(
    () => () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    },
    [],
  );

  const activeLabel = useMemo(
    () => workspaceTabs.find((tab) => tab.key === activeTab)?.label ?? "Asset",
    [activeTab],
  );

  const activeContent = drafts[activeTab];
  const isEmpty = activeContent.trim().length === 0;
  const keywordsMeta = useMemo(() => computeKeywordsMeta(drafts.KEYWORDS), [drafts.KEYWORDS]);

  async function handleCopy() {
    if (isEmpty || isTabLoading) return;

    await navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleRegenerateDescription() {
    if (activeTab !== "DESCRIPTION") {
      return;
    }

    setDescriptionError(null);
    setCopied(false);
    setIsGeneratingDescription(true);
    setIsTabLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/generate-description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const body = (await response.json()) as {
        error?: string;
        details?: string;
        data?: {
          content?: Record<string, unknown>;
        };
      };

      if (!response.ok || !body.data?.content) {
        throw new Error(body.error || body.details || "Failed to generate description");
      }

      setDrafts((prev) => ({
        ...prev,
        DESCRIPTION: JSON.stringify(body.data?.content, null, 2),
      }));
    } catch (error) {
      setDescriptionError(error instanceof Error ? error.message : "Failed to generate description");
    } finally {
      setIsGeneratingDescription(false);
      setIsTabLoading(false);
    }
  }

  async function runKeywordsGeneration() {
    setKeywordsError(null);
    setCopied(false);
    setIsGeneratingKeywords(true);
    setIsTabLoading(true);

    try {
      const response = await fetch("/api/generate/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const body = (await response.json()) as {
        error?: string;
        details?: string;
        data?: {
          content?: {
            keywords?: string[];
            characterCount?: number;
            withinLimit?: boolean;
          };
        };
      };

      if (!response.ok || !body.data?.content?.keywords) {
        throw new Error(body.error || body.details || "Failed to generate keywords");
      }

      const normalizedKeywords = parseKeywordsFromUnknown(body.data.content.keywords);

      setDrafts((prev) => ({
        ...prev,
        KEYWORDS: normalizedKeywords.join(", "),
      }));
    } catch (error) {
      setKeywordsError(error instanceof Error ? error.message : "Failed to generate keywords");
    } finally {
      setIsGeneratingKeywords(false);
      setIsTabLoading(false);
    }
  }

  function handleTabChange(nextTab: WorkspaceTabType) {
    if (nextTab === activeTab) {
      return;
    }

    setCopied(false);
    if (nextTab !== "DESCRIPTION") {
      setDescriptionError(null);
    }
    if (nextTab !== "KEYWORDS") {
      setKeywordsError(null);
    }
    setIsTabLoading(true);
    setActiveTab(nextTab);

    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }

    loadingTimerRef.current = setTimeout(() => {
      setIsTabLoading(false);
    }, 350);
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>Generated Assets</CardTitle>
          <CardDescription>
            Switch between tabs, edit content, and copy output. Description + Keywords generation are connected.
          </CardDescription>
        </div>

        <div className="flex flex-wrap gap-2">
          {workspaceTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition",
                activeTab === tab.key
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-900">{activeLabel}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleCopy} disabled={isEmpty || isTabLoading}>
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "Copied" : "Copy"}
            </Button>

            {activeTab === "DESCRIPTION" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isGeneratingDescription}
                onClick={handleRegenerateDescription}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                {isGeneratingDescription ? "Generating..." : "Regenerate Description"}
              </Button>
            ) : null}

            {activeTab === "KEYWORDS" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingKeywords || keywordsMeta.keywords.length > 0}
                  onClick={runKeywordsGeneration}
                >
                  <WandSparkles className="mr-2 h-4 w-4" />
                  {isGeneratingKeywords ? "Generating..." : "Generate Keywords"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingKeywords}
                  onClick={runKeywordsGeneration}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {isGeneratingKeywords ? "Regenerating..." : "Regenerate Keywords"}
                </Button>
              </>
            ) : null}

            {activeTab !== "DESCRIPTION" && activeTab !== "KEYWORDS" ? (
              <Button type="button" variant="outline" size="sm" disabled>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Regenerate (soon)
              </Button>
            ) : null}
          </div>
        </div>

        {descriptionError && activeTab === "DESCRIPTION" ? (
          <p className="text-sm text-red-600">{descriptionError}</p>
        ) : null}

        {keywordsError && activeTab === "KEYWORDS" ? (
          <p className="text-sm text-red-600">{keywordsError}</p>
        ) : null}

        {activeTab === "KEYWORDS" && !isTabLoading ? (
          <div className="text-xs text-slate-600">
            {keywordsMeta.keywords.length} keywords · {keywordsMeta.characterCount} / 100 characters · {" "}
            <span className={keywordsMeta.withinLimit ? "text-green-700" : "text-red-600"}>
              {keywordsMeta.withinLimit ? "Within limit" : "Over limit"}
            </span>
          </div>
        ) : null}

        {isTabLoading ? (
          <div className="space-y-3">
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-56 animate-pulse rounded-md bg-slate-100" />
          </div>
        ) : (
          <>
            {isEmpty ? (
              <Card className="border-dashed bg-slate-50">
                <CardContent className="p-4 text-sm text-slate-600">
                  {activeTab === "KEYWORDS"
                    ? "No keywords generated yet. Use Generate Keywords to create the first set."
                    : "No content in this tab yet. Start writing manually or use regenerate when available."}
                </CardContent>
              </Card>
            ) : null}

            <Textarea
              value={activeContent}
              onChange={(event) =>
                setDrafts((prev) => ({
                  ...prev,
                  [activeTab]: event.target.value,
                }))
              }
              className="min-h-72 font-mono text-sm"
              placeholder={
                activeTab === "KEYWORDS"
                  ? "keyword one, keyword two, keyword three"
                  : `Write ${activeLabel.toLowerCase()} content here...`
              }
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
