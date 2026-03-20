"use client";

import { Copy, RefreshCcw, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type WorkspaceTabType =
  | "DESCRIPTION"
  | "KEYWORDS"
  | "SCREENSHOT_CAPTIONS"
  | "UPDATE_NOTES"
  | "LOCALIZATION";

type UpdateNotesMode = "bug-fix" | "minor-update" | "feature-release" | "major-release";

const workspaceTabs: Array<{ key: WorkspaceTabType; label: string }> = [
  { key: "DESCRIPTION", label: "Description" },
  { key: "KEYWORDS", label: "Keywords" },
  { key: "SCREENSHOT_CAPTIONS", label: "Screenshot Captions" },
  { key: "UPDATE_NOTES", label: "Update Notes" },
  { key: "LOCALIZATION", label: "Localization" },
];

const updateNotesModes: Array<{ value: UpdateNotesMode; label: string }> = [
  { value: "bug-fix", label: "Bug Fix" },
  { value: "minor-update", label: "Minor Update" },
  { value: "feature-release", label: "Feature Release" },
  { value: "major-release", label: "Major Release" },
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

type CaptionsContentShape = {
  captions: string[];
  overLimitCount: number;
};

type UpdateNotesContentShape = {
  title: string;
  notes: string[];
};

const CAPTION_MAX_LENGTH = 70;

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

function dedupeList(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = value.toLowerCase();

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(value);
  }

  return output;
}

function parseKeywordsFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) {
    return dedupeList(
      value
        .filter((item): item is string => typeof item === "string")
        .flatMap((item) => tokenizeKeywords(item)),
    );
  }

  if (typeof value === "string") {
    return dedupeList(tokenizeKeywords(value));
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

  return dedupeList(tokenizeKeywords(trimmed));
}

function normalizeCaption(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function parseCaptionsFromUnknown(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return dedupeList(
    value
      .flatMap((item) => {
        if (typeof item === "string") {
          return [normalizeCaption(item)];
        }

        if (typeof item === "object" && item !== null && "caption" in item) {
          const caption = (item as { caption?: unknown }).caption;
          if (typeof caption === "string") {
            return [normalizeCaption(caption)];
          }
        }

        return [] as string[];
      })
      .filter(Boolean),
  );
}

function parseCaptionsFromDraft(draft: string): string[] {
  const trimmed = draft.trim();

  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "object" && parsed !== null && "captions" in parsed) {
      return parseCaptionsFromUnknown((parsed as { captions?: unknown }).captions);
    }
  } catch {
    // Fall through to line parsing.
  }

  return dedupeList(
    trimmed
      .split("\n")
      .map(normalizeCaption)
      .filter(Boolean),
  );
}

function parseUpdateNotesFromUnknown(value: unknown): UpdateNotesContentShape {
  if (typeof value !== "object" || value === null) {
    return { title: "", notes: [] };
  }

  const title =
    "title" in value && typeof (value as { title?: unknown }).title === "string"
      ? (value as { title: string }).title.trim()
      : "";

  const notes =
    "notes" in value && Array.isArray((value as { notes?: unknown }).notes)
      ? dedupeList(
          ((value as { notes: unknown[] }).notes || [])
            .filter((note): note is string => typeof note === "string")
            .map((note) => note.trim().replace(/\s+/g, " "))
            .filter(Boolean),
        )
      : [];

  return { title, notes };
}

function formatUpdateNotesForEditor(value: UpdateNotesContentShape) {
  if (!value.title && value.notes.length === 0) {
    return "";
  }

  return [
    `Title: ${value.title}`,
    "",
    ...value.notes.map((note) => `- ${note}`),
  ]
    .join("\n")
    .trim();
}

function parseUpdateNotesFromDraft(draft: string): UpdateNotesContentShape {
  const trimmed = draft.trim();
  if (!trimmed) {
    return { title: "", notes: [] };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "object" && parsed !== null && "title" in parsed && "notes" in parsed) {
      return parseUpdateNotesFromUnknown(parsed);
    }
  } catch {
    // Parse text format below.
  }

  const lines = trimmed.split("\n").map((line) => line.trim()).filter(Boolean);

  let title = "";
  const notes: string[] = [];

  for (const line of lines) {
    if (!title && /^title\s*:/i.test(line)) {
      title = line.replace(/^title\s*:/i, "").trim();
      continue;
    }

    if (!title) {
      title = line.replace(/^[-*]\s*/, "").trim();
      continue;
    }

    notes.push(line.replace(/^[-*]\s*/, "").trim());
  }

  return {
    title,
    notes: dedupeList(notes.filter(Boolean)),
  };
}

function normalizeInitialKeywords(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "object" && parsed !== null && "keywords" in parsed) {
      return parseKeywordsFromUnknown((parsed as { keywords?: unknown }).keywords).join(", ");
    }
  } catch {
    // Keep draft as-is.
  }

  return trimmed;
}

function normalizeInitialCaptions(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "object" && parsed !== null && "captions" in parsed) {
      return parseCaptionsFromUnknown((parsed as { captions?: unknown }).captions).join("\n");
    }
  } catch {
    // Keep draft as-is.
  }

  return trimmed;
}

function normalizeInitialUpdateNotes(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "object" && parsed !== null && "title" in parsed && "notes" in parsed) {
      return formatUpdateNotesForEditor(parseUpdateNotesFromUnknown(parsed));
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

function computeCaptionsMeta(draft: string): CaptionsContentShape {
  const captions = parseCaptionsFromDraft(draft);
  const overLimitCount = captions.filter((caption) => caption.length > CAPTION_MAX_LENGTH).length;

  return {
    captions,
    overLimitCount,
  };
}

export function ProjectWorkspaceTabs({ projectId, initialContent }: Props) {
  const [activeTab, setActiveTab] = useState<WorkspaceTabType>("DESCRIPTION");
  const [drafts, setDrafts] = useState<Record<WorkspaceTabType, string>>({
    DESCRIPTION: initialContent.DESCRIPTION || "",
    KEYWORDS: normalizeInitialKeywords(initialContent.KEYWORDS),
    SCREENSHOT_CAPTIONS: normalizeInitialCaptions(initialContent.SCREENSHOT_CAPTIONS),
    UPDATE_NOTES: normalizeInitialUpdateNotes(initialContent.UPDATE_NOTES),
    LOCALIZATION: initialContent.LOCALIZATION || "",
  });
  const [isTabLoading, setIsTabLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [keywordsError, setKeywordsError] = useState<string | null>(null);

  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [captionsError, setCaptionsError] = useState<string | null>(null);

  const [isGeneratingUpdateNotes, setIsGeneratingUpdateNotes] = useState(false);
  const [updateNotesError, setUpdateNotesError] = useState<string | null>(null);
  const [updateNotesMode, setUpdateNotesMode] = useState<UpdateNotesMode>("minor-update");

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
  const captionsMeta = useMemo(() => computeCaptionsMeta(drafts.SCREENSHOT_CAPTIONS), [drafts.SCREENSHOT_CAPTIONS]);
  const updateNotesMeta = useMemo(() => parseUpdateNotesFromDraft(drafts.UPDATE_NOTES), [drafts.UPDATE_NOTES]);

  async function handleCopy() {
    if (isEmpty || isTabLoading) return;

    await navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleRegenerateDescription() {
    if (activeTab !== "DESCRIPTION") return;

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
        data?: { content?: Record<string, unknown> };
      };

      if (!response.ok || !body.data?.content) {
        throw new Error(body.error || body.details || "Failed to generate description");
      }
      const descriptionContent = body.data.content;

      setDrafts((prev) => ({
        ...prev,
        DESCRIPTION: JSON.stringify(descriptionContent, null, 2),
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
        data?: { content?: { keywords?: string[] } };
      };

      if (!response.ok || !body.data?.content?.keywords) {
        throw new Error(body.error || body.details || "Failed to generate keywords");
      }
      const keywordItems = body.data.content.keywords;

      setDrafts((prev) => ({
        ...prev,
        KEYWORDS: parseKeywordsFromUnknown(keywordItems).join(", "),
      }));
    } catch (error) {
      setKeywordsError(error instanceof Error ? error.message : "Failed to generate keywords");
    } finally {
      setIsGeneratingKeywords(false);
      setIsTabLoading(false);
    }
  }

  async function runCaptionsGeneration() {
    setCaptionsError(null);
    setCopied(false);
    setIsGeneratingCaptions(true);
    setIsTabLoading(true);

    try {
      const response = await fetch("/api/generate/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const body = (await response.json()) as {
        error?: string;
        details?: string;
        data?: { content?: { captions?: string[] } };
      };

      if (!response.ok || !body.data?.content?.captions) {
        throw new Error(body.error || body.details || "Failed to generate screenshot captions");
      }
      const captionItems = body.data.content.captions;

      setDrafts((prev) => ({
        ...prev,
        SCREENSHOT_CAPTIONS: parseCaptionsFromUnknown(captionItems).join("\n"),
      }));
    } catch (error) {
      setCaptionsError(error instanceof Error ? error.message : "Failed to generate screenshot captions");
    } finally {
      setIsGeneratingCaptions(false);
      setIsTabLoading(false);
    }
  }

  async function runUpdateNotesGeneration() {
    setUpdateNotesError(null);
    setCopied(false);
    setIsGeneratingUpdateNotes(true);
    setIsTabLoading(true);

    try {
      const response = await fetch("/api/generate/update-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          mode: updateNotesMode,
        }),
      });

      const body = (await response.json()) as {
        error?: string;
        details?: string;
        data?: { content?: { title?: string; notes?: string[] } };
      };

      if (!response.ok || !body.data?.content) {
        throw new Error(body.error || body.details || "Failed to generate update notes");
      }
      const updateNotesContent = body.data.content;

      setDrafts((prev) => ({
        ...prev,
        UPDATE_NOTES: formatUpdateNotesForEditor(
          parseUpdateNotesFromUnknown({
            title: updateNotesContent.title,
            notes: updateNotesContent.notes,
          }),
        ),
      }));
    } catch (error) {
      setUpdateNotesError(error instanceof Error ? error.message : "Failed to generate update notes");
    } finally {
      setIsGeneratingUpdateNotes(false);
      setIsTabLoading(false);
    }
  }

  function handleTabChange(nextTab: WorkspaceTabType) {
    if (nextTab === activeTab) return;

    setCopied(false);
    if (nextTab !== "DESCRIPTION") setDescriptionError(null);
    if (nextTab !== "KEYWORDS") setKeywordsError(null);
    if (nextTab !== "SCREENSHOT_CAPTIONS") setCaptionsError(null);
    if (nextTab !== "UPDATE_NOTES") setUpdateNotesError(null);

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
            Switch between tabs, edit content, and copy output. Description, Keywords, Screenshot Captions, and Update Notes are connected.
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

            {activeTab === "SCREENSHOT_CAPTIONS" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingCaptions || captionsMeta.captions.length > 0}
                  onClick={runCaptionsGeneration}
                >
                  <WandSparkles className="mr-2 h-4 w-4" />
                  {isGeneratingCaptions ? "Generating..." : "Generate Captions"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingCaptions}
                  onClick={runCaptionsGeneration}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {isGeneratingCaptions ? "Regenerating..." : "Regenerate Captions"}
                </Button>
              </>
            ) : null}

            {activeTab === "UPDATE_NOTES" ? (
              <>
                <Select value={updateNotesMode} onValueChange={(value) => setUpdateNotesMode(value as UpdateNotesMode)}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {updateNotesModes.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingUpdateNotes || updateNotesMeta.notes.length > 0}
                  onClick={runUpdateNotesGeneration}
                >
                  <WandSparkles className="mr-2 h-4 w-4" />
                  {isGeneratingUpdateNotes ? "Generating..." : "Generate Update Notes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingUpdateNotes}
                  onClick={runUpdateNotesGeneration}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {isGeneratingUpdateNotes ? "Regenerating..." : "Regenerate Update Notes"}
                </Button>
              </>
            ) : null}

            {activeTab === "LOCALIZATION" ? (
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

        {captionsError && activeTab === "SCREENSHOT_CAPTIONS" ? (
          <p className="text-sm text-red-600">{captionsError}</p>
        ) : null}

        {updateNotesError && activeTab === "UPDATE_NOTES" ? (
          <p className="text-sm text-red-600">{updateNotesError}</p>
        ) : null}

        {activeTab === "KEYWORDS" && !isTabLoading ? (
          <div className="text-xs text-slate-600">
            {keywordsMeta.keywords.length} keywords · {keywordsMeta.characterCount} / 100 characters ·{" "}
            <span className={keywordsMeta.withinLimit ? "text-green-700" : "text-red-600"}>
              {keywordsMeta.withinLimit ? "Within limit" : "Over limit"}
            </span>
          </div>
        ) : null}

        {activeTab === "SCREENSHOT_CAPTIONS" && !isTabLoading ? (
          <div className="text-xs text-slate-600">
            {captionsMeta.captions.length} captions · max {CAPTION_MAX_LENGTH} chars each ·{" "}
            <span className={captionsMeta.overLimitCount === 0 ? "text-green-700" : "text-red-600"}>
              {captionsMeta.overLimitCount === 0
                ? "All captions within limit"
                : `${captionsMeta.overLimitCount} caption(s) exceed limit`}
            </span>
          </div>
        ) : null}

        {activeTab === "UPDATE_NOTES" && !isTabLoading ? (
          <div className="text-xs text-slate-600">
            {updateNotesMeta.notes.length} notes · title {updateNotesMeta.title ? "set" : "missing"}
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
                    : activeTab === "SCREENSHOT_CAPTIONS"
                      ? "No screenshot captions generated yet. Use Generate Captions to create the first set."
                      : activeTab === "UPDATE_NOTES"
                        ? "No update notes generated yet. Pick a mode and generate your first notes."
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
                  : activeTab === "SCREENSHOT_CAPTIONS"
                    ? "Capture your progress in seconds\nStay focused with smart reminders"
                    : activeTab === "UPDATE_NOTES"
                      ? "Title: What's New\n- Improved onboarding performance\n- Fixed reminder sync issue"
                      : `Write ${activeLabel.toLowerCase()} content here...`
              }
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
