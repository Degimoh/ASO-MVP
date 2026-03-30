"use client";

import { CheckCircle2, Copy, History, RefreshCcw, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
type LocalizableSourceAssetType = "DESCRIPTION" | "KEYWORDS" | "SCREENSHOT_CAPTIONS" | "UPDATE_NOTES";

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

const localizationSourceAssetOptions: Array<{ value: LocalizableSourceAssetType; label: string }> = [
  { value: "DESCRIPTION", label: "Description" },
  { value: "KEYWORDS", label: "Keywords" },
  { value: "SCREENSHOT_CAPTIONS", label: "Screenshot Captions" },
  { value: "UPDATE_NOTES", label: "Update Notes" },
];

type Props = {
  projectId: string;
  availableLocales: string[];
  initialContent: Partial<Record<WorkspaceTabType, string>>;
  initialVersionHistory: VersionHistoryItem[];
  initialWalletBalance: number;
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

type GenerateAllAssetResponse =
  | {
      status: "success";
      generationId: string;
      version: number;
      locale: string | null;
      model: string;
      generatedAt: string;
      creditsCharged: number;
      walletBalanceAfter: number;
      content: Record<string, unknown>;
    }
  | {
      status: "error";
      error: string;
    };

type VersionHistoryItem = {
  id: string;
  type: WorkspaceTabType;
  locale: string | null;
  version: number;
  model: string;
  generatedAt: string;
};

const CAPTION_MAX_LENGTH = 70;
const DESCRIPTION_MAX_CHARS = 4000;
const UPDATE_NOTES_MAX_TITLE_CHARS = 80;
const UPDATE_NOTES_MAX_NOTE_CHARS = 170;
const UPDATE_NOTES_MAX_TOTAL_CHARS = 4000;
const LOCALIZATION_MAX_CHARS = 6000;
const ASSET_GENERATION_COSTS: Record<WorkspaceTabType, number> = {
  DESCRIPTION: 3,
  KEYWORDS: 1,
  SCREENSHOT_CAPTIONS: 2,
  UPDATE_NOTES: 1,
  LOCALIZATION: 2,
};
const GENERATE_ALL_COST =
  ASSET_GENERATION_COSTS.DESCRIPTION +
  ASSET_GENERATION_COSTS.KEYWORDS +
  ASSET_GENERATION_COSTS.SCREENSHOT_CAPTIONS +
  ASSET_GENERATION_COSTS.UPDATE_NOTES;

type DraftValidation = {
  characterCount: number;
  errors: string[];
  warnings: string[];
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

function findDuplicateCount(values: string[]) {
  const seen = new Set<string>();
  let duplicateCount = 0;

  for (const value of values) {
    const normalized = value.toLowerCase();

    if (seen.has(normalized)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(normalized);
  }

  return duplicateCount;
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

function parseDescriptionFromDraft(draft: string): Record<string, unknown> | null {
  const trimmed = draft.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatDraftForTab(tab: WorkspaceTabType, content: unknown): string {
  if (tab === "KEYWORDS") {
    return parseKeywordsFromUnknown(
      typeof content === "object" && content !== null ? (content as { keywords?: unknown }).keywords : content,
    ).join(", ");
  }

  if (tab === "SCREENSHOT_CAPTIONS") {
    return parseCaptionsFromUnknown(
      typeof content === "object" && content !== null ? (content as { captions?: unknown }).captions : content,
    ).join("\n");
  }

  if (tab === "UPDATE_NOTES") {
    return formatUpdateNotesForEditor(parseUpdateNotesFromUnknown(content));
  }

  return JSON.stringify(content, null, 2);
}

function getApiErrorMessage(
  body: {
    error?: string;
    details?: string;
    code?: string;
    requiredCredits?: number;
    availableCredits?: number;
  },
  fallback: string,
) {
  if (body.code === "INSUFFICIENT_CREDITS") {
    if (body.details) {
      return body.details;
    }

    if (typeof body.requiredCredits === "number" && typeof body.availableCredits === "number") {
      return `You need ${body.requiredCredits} credits but only have ${body.availableCredits}.`;
    }

    return "Insufficient credits";
  }

  return body.error || body.details || fallback;
}

function buildGenerationTooltip(input: {
  actionLabel: string;
  cost: number;
  balance: number;
  canAfford: boolean;
}) {
  const affordability = input.canAfford
    ? "Enough credits available."
    : `Insufficient credits: need ${input.cost}, have ${input.balance}.`;

  return `${input.actionLabel}\nCost formula: ${input.cost} credit(s) per run.\nCurrent balance: ${input.balance} credit(s).\n${affordability}`;
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

function countStringLeaves(value: unknown): number {
  if (typeof value === "string") {
    return value.trim().length > 0 ? 1 : 0;
  }

  if (Array.isArray(value)) {
    return value.reduce((total, entry) => total + countStringLeaves(entry), 0);
  }

  if (typeof value === "object" && value !== null) {
    return Object.values(value).reduce((total, entry) => total + countStringLeaves(entry), 0);
  }

  return 0;
}

function validateDescriptionDraft(draft: string): DraftValidation {
  const trimmed = draft.trim();
  if (!trimmed) {
    return { characterCount: 0, errors: [], warnings: [] };
  }

  const errors: string[] = [];
  const parsed = parseDescriptionFromDraft(trimmed);
  if (!parsed) {
    return {
      characterCount: trimmed.length,
      errors: ["Description must be valid JSON with hook, body, features, cta, and fullText fields."],
      warnings: [],
    };
  }

  const hook = typeof parsed.hook === "string" ? parsed.hook.trim() : "";
  const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
  const cta = typeof parsed.cta === "string" ? parsed.cta.trim() : "";
  const fullText = typeof parsed.fullText === "string" ? parsed.fullText.trim() : "";
  const features = Array.isArray(parsed.features)
    ? (parsed.features as unknown[])
        .filter((feature): feature is string => typeof feature === "string")
        .map((feature) => feature.trim())
        .filter(Boolean)
    : [];

  if (!hook) errors.push("Missing hook text.");
  if (!body) errors.push("Missing body text.");
  if (!cta) errors.push("Missing CTA text.");
  if (features.length === 0) errors.push("Include at least one feature.");
  if (!fullText) errors.push("Missing fullText.");
  if (fullText.length > DESCRIPTION_MAX_CHARS) {
    errors.push(`fullText exceeds ${DESCRIPTION_MAX_CHARS} characters.`);
  }

  return {
    characterCount: fullText.length || trimmed.length,
    errors,
    warnings: [],
  };
}

function validateKeywordsDraft(draft: string): DraftValidation {
  const trimmed = draft.trim();
  if (!trimmed) {
    return { characterCount: 0, errors: [], warnings: [] };
  }

  const rawTokens = tokenizeKeywords(trimmed);
  const keywords = dedupeList(rawTokens);
  const characterCount = keywords.join(",").length;
  const duplicateCount = findDuplicateCount(rawTokens);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (keywords.length === 0) {
    errors.push("Add at least one keyword.");
  }
  if (characterCount > 100) {
    errors.push("Keyword string exceeds the 100 character limit.");
  }
  if (duplicateCount > 0) {
    warnings.push(`${duplicateCount} duplicate keyword(s) were detected.`);
  }

  return { characterCount, errors, warnings };
}

function validateCaptionsDraft(draft: string): DraftValidation {
  const trimmed = draft.trim();
  if (!trimmed) {
    return { characterCount: 0, errors: [], warnings: [] };
  }

  const rawLines = trimmed
    .split("\n")
    .map(normalizeCaption)
    .filter(Boolean);
  const captions = dedupeList(rawLines);
  const duplicateCount = findDuplicateCount(rawLines);
  const overLimitCount = captions.filter((caption) => caption.length > CAPTION_MAX_LENGTH).length;
  const characterCount = captions.reduce((total, caption) => total + caption.length, 0);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (captions.length === 0) {
    errors.push("Add at least one caption.");
  }
  if (overLimitCount > 0) {
    errors.push(`${overLimitCount} caption(s) exceed ${CAPTION_MAX_LENGTH} characters.`);
  }
  if (duplicateCount > 0) {
    warnings.push(`${duplicateCount} duplicate caption(s) were detected.`);
  }

  return { characterCount, errors, warnings };
}

function validateUpdateNotesDraft(draft: string): DraftValidation {
  const trimmed = draft.trim();
  if (!trimmed) {
    return { characterCount: 0, errors: [], warnings: [] };
  }

  const parsed = parseUpdateNotesFromDraft(trimmed);
  const errors: string[] = [];
  const characterCount =
    parsed.title.length + parsed.notes.reduce((total, note) => total + note.length, 0) + parsed.notes.length;

  if (!parsed.title) errors.push("Update notes title is required.");
  if (parsed.notes.length === 0) errors.push("Add at least one update note item.");
  if (parsed.title.length > UPDATE_NOTES_MAX_TITLE_CHARS) {
    errors.push(`Title exceeds ${UPDATE_NOTES_MAX_TITLE_CHARS} characters.`);
  }
  const longNotes = parsed.notes.filter((note) => note.length > UPDATE_NOTES_MAX_NOTE_CHARS).length;
  if (longNotes > 0) {
    errors.push(`${longNotes} note(s) exceed ${UPDATE_NOTES_MAX_NOTE_CHARS} characters.`);
  }
  if (characterCount > UPDATE_NOTES_MAX_TOTAL_CHARS) {
    errors.push(`Update notes exceed ${UPDATE_NOTES_MAX_TOTAL_CHARS} characters total.`);
  }

  return { characterCount, errors, warnings: [] };
}

function validateLocalizationDraft(draft: string): DraftValidation {
  const trimmed = draft.trim();
  if (!trimmed) {
    return { characterCount: 0, errors: [], warnings: [] };
  }

  const errors: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return {
      characterCount: trimmed.length,
      errors: ["Localization content must be valid JSON."],
      warnings: [],
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    errors.push("Localization content must be a JSON object.");
  }

  const stringLeaves = countStringLeaves(parsed);
  if (stringLeaves === 0) {
    errors.push("Localization content should include at least one translated string.");
  }
  if (trimmed.length > LOCALIZATION_MAX_CHARS) {
    errors.push(`Localization content exceeds ${LOCALIZATION_MAX_CHARS} characters.`);
  }

  return {
    characterCount: trimmed.length,
    errors,
    warnings: [],
  };
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

function buildLocalizationSourceContent(input: {
  sourceAssetType: LocalizableSourceAssetType;
  descriptionDraft: string;
  keywordsDraft: string;
  captionsDraft: string;
  updateNotesDraft: string;
}): Record<string, unknown> | null {
  switch (input.sourceAssetType) {
    case "DESCRIPTION":
      return parseDescriptionFromDraft(input.descriptionDraft);
    case "KEYWORDS": {
      const keywordsMeta = computeKeywordsMeta(input.keywordsDraft);
      if (keywordsMeta.keywords.length === 0) return null;
      return keywordsMeta;
    }
    case "SCREENSHOT_CAPTIONS": {
      const captionsMeta = computeCaptionsMeta(input.captionsDraft);
      if (captionsMeta.captions.length === 0) return null;
      return { captions: captionsMeta.captions };
    }
    case "UPDATE_NOTES": {
      const updateNotes = parseUpdateNotesFromDraft(input.updateNotesDraft);
      if (!updateNotes.title || updateNotes.notes.length === 0) return null;
      return updateNotes;
    }
    default:
      return null;
  }
}

export function ProjectWorkspaceTabs({
  projectId,
  availableLocales,
  initialContent,
  initialVersionHistory,
  initialWalletBalance,
}: Props) {
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
  const [copySuccessMessage, setCopySuccessMessage] = useState<string | null>(null);

  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [keywordsError, setKeywordsError] = useState<string | null>(null);

  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [captionsError, setCaptionsError] = useState<string | null>(null);

  const [isGeneratingUpdateNotes, setIsGeneratingUpdateNotes] = useState(false);
  const [updateNotesError, setUpdateNotesError] = useState<string | null>(null);
  const [updateNotesMode, setUpdateNotesMode] = useState<UpdateNotesMode>("minor-update");

  const [isGeneratingLocalization, setIsGeneratingLocalization] = useState(false);
  const [localizationError, setLocalizationError] = useState<string | null>(null);
  const [localizationSourceAsset, setLocalizationSourceAsset] =
    useState<LocalizableSourceAssetType>("DESCRIPTION");
  const [targetLocale, setTargetLocale] = useState<string>(availableLocales[0] || "en-US");
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [walletBalance, setWalletBalance] = useState(initialWalletBalance);
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>(initialVersionHistory);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [generateAllNotice, setGenerateAllNotice] = useState<{
    type: "success" | "partial" | "error";
    message: string;
  } | null>(null);

  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (availableLocales.length === 0) {
      return;
    }

    if (!availableLocales.includes(targetLocale)) {
      setTargetLocale(availableLocales[0]);
    }
  }, [availableLocales, targetLocale]);

  const activeLabel = useMemo(
    () => workspaceTabs.find((tab) => tab.key === activeTab)?.label ?? "Asset",
    [activeTab],
  );

  const activeContent = drafts[activeTab];
  const isEmpty = activeContent.trim().length === 0;

  const keywordsMeta = useMemo(() => computeKeywordsMeta(drafts.KEYWORDS), [drafts.KEYWORDS]);
  const captionsMeta = useMemo(() => computeCaptionsMeta(drafts.SCREENSHOT_CAPTIONS), [drafts.SCREENSHOT_CAPTIONS]);
  const updateNotesMeta = useMemo(() => parseUpdateNotesFromDraft(drafts.UPDATE_NOTES), [drafts.UPDATE_NOTES]);
  const descriptionValidation = useMemo(() => validateDescriptionDraft(drafts.DESCRIPTION), [drafts.DESCRIPTION]);
  const keywordsValidation = useMemo(() => validateKeywordsDraft(drafts.KEYWORDS), [drafts.KEYWORDS]);
  const captionsValidation = useMemo(() => validateCaptionsDraft(drafts.SCREENSHOT_CAPTIONS), [drafts.SCREENSHOT_CAPTIONS]);
  const updateNotesValidation = useMemo(() => validateUpdateNotesDraft(drafts.UPDATE_NOTES), [drafts.UPDATE_NOTES]);
  const localizationValidation = useMemo(() => validateLocalizationDraft(drafts.LOCALIZATION), [drafts.LOCALIZATION]);
  const localizationSourceContent = useMemo(
    () =>
      buildLocalizationSourceContent({
        sourceAssetType: localizationSourceAsset,
        descriptionDraft: drafts.DESCRIPTION,
        keywordsDraft: drafts.KEYWORDS,
        captionsDraft: drafts.SCREENSHOT_CAPTIONS,
        updateNotesDraft: drafts.UPDATE_NOTES,
      }),
    [
      drafts.DESCRIPTION,
      drafts.KEYWORDS,
      drafts.SCREENSHOT_CAPTIONS,
      drafts.UPDATE_NOTES,
      localizationSourceAsset,
    ],
  );
  const isAnyGenerationRunning =
    isGeneratingAll ||
    isGeneratingDescription ||
    isGeneratingKeywords ||
    isGeneratingCaptions ||
    isGeneratingUpdateNotes ||
    isGeneratingLocalization ||
    restoringVersionId !== null;
  const areGenerationButtonsDisabled = isAnyGenerationRunning || isTabLoading;
  const activeGenerationCost = ASSET_GENERATION_COSTS[activeTab];
  const canAffordActiveGeneration = walletBalance >= activeGenerationCost;
  const canAffordGenerateAll = walletBalance >= GENERATE_ALL_COST;
  const generateAllTooltip = `Generate all assets (Description + Keywords + Screenshot Captions + Update Notes)\nCost formula: 3 + 1 + 2 + 1 = ${GENERATE_ALL_COST} credits.\nCurrent balance: ${walletBalance} credit(s).\n${
    canAffordGenerateAll ? "Enough credits available." : `Insufficient credits: need ${GENERATE_ALL_COST}, have ${walletBalance}.`
  }`;
  const descriptionTooltip = buildGenerationTooltip({
    actionLabel: "Generate App Store Description",
    cost: ASSET_GENERATION_COSTS.DESCRIPTION,
    balance: walletBalance,
    canAfford: walletBalance >= ASSET_GENERATION_COSTS.DESCRIPTION,
  });
  const keywordsTooltip = buildGenerationTooltip({
    actionLabel: "Generate Keywords",
    cost: ASSET_GENERATION_COSTS.KEYWORDS,
    balance: walletBalance,
    canAfford: walletBalance >= ASSET_GENERATION_COSTS.KEYWORDS,
  });
  const captionsTooltip = buildGenerationTooltip({
    actionLabel: "Generate Screenshot Captions",
    cost: ASSET_GENERATION_COSTS.SCREENSHOT_CAPTIONS,
    balance: walletBalance,
    canAfford: walletBalance >= ASSET_GENERATION_COSTS.SCREENSHOT_CAPTIONS,
  });
  const updateNotesTooltip = buildGenerationTooltip({
    actionLabel: "Generate Update Notes",
    cost: ASSET_GENERATION_COSTS.UPDATE_NOTES,
    balance: walletBalance,
    canAfford: walletBalance >= ASSET_GENERATION_COSTS.UPDATE_NOTES,
  });
  const localizationTooltip = buildGenerationTooltip({
    actionLabel: "Generate Localization",
    cost: ASSET_GENERATION_COSTS.LOCALIZATION,
    balance: walletBalance,
    canAfford: walletBalance >= ASSET_GENERATION_COSTS.LOCALIZATION,
  });
  const activeValidation = useMemo(() => {
    switch (activeTab) {
      case "DESCRIPTION":
        return descriptionValidation;
      case "KEYWORDS":
        return keywordsValidation;
      case "SCREENSHOT_CAPTIONS":
        return captionsValidation;
      case "UPDATE_NOTES":
        return updateNotesValidation;
      case "LOCALIZATION":
        return localizationValidation;
      default:
        return { characterCount: 0, errors: [], warnings: [] };
    }
  }, [
    activeTab,
    captionsValidation,
    descriptionValidation,
    keywordsValidation,
    localizationValidation,
    updateNotesValidation,
  ]);
  const visibleVersionHistory = useMemo(() => {
    const filtered = versionHistory.filter((entry) => {
      if (entry.type !== activeTab) {
        return false;
      }

      if (activeTab === "LOCALIZATION") {
        return entry.locale === targetLocale;
      }

      return true;
    });

    return filtered.sort((a, b) => b.version - a.version || b.generatedAt.localeCompare(a.generatedAt));
  }, [activeTab, targetLocale, versionHistory]);
  const activeVersionId = visibleVersionHistory[0]?.id;

  function appendVersionHistory(entry: VersionHistoryItem) {
    setVersionHistory((prev) => (prev.some((item) => item.id === entry.id) ? prev : [entry, ...prev]));
  }

  async function handleCopy() {
    if (isEmpty || isTabLoading) return;

    await navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setCopySuccessMessage(`${activeLabel} copied to clipboard.`);

    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }

    copyTimerRef.current = setTimeout(() => {
      setCopied(false);
      setCopySuccessMessage(null);
    }, 1800);
  }

  async function handleRegenerateDescription() {
    if (activeTab !== "DESCRIPTION") return;

    setDescriptionError(null);
    setCopied(false);
    setCopySuccessMessage(null);
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
        code?: string;
        requiredCredits?: number;
        availableCredits?: number;
        data?: {
          generationId?: string;
          version?: number;
          model?: string;
          locale?: string | null;
          generatedAt?: string;
          walletBalanceAfter?: number;
          content?: Record<string, unknown>;
        };
      };

      if (!response.ok || !body.data?.content) {
        throw new Error(getApiErrorMessage(body, "Failed to generate description"));
      }
      const descriptionContent = body.data.content;

      setDrafts((prev) => ({
        ...prev,
        DESCRIPTION: JSON.stringify(descriptionContent, null, 2),
      }));
      if (body.data?.generationId && body.data?.version && body.data?.model) {
        appendVersionHistory({
          id: body.data.generationId,
          type: "DESCRIPTION",
          locale: "locale" in body.data ? ((body.data as { locale?: string }).locale ?? null) : null,
          version: body.data.version,
          model: body.data.model,
          generatedAt:
            "generatedAt" in body.data && typeof (body.data as { generatedAt?: unknown }).generatedAt === "string"
              ? (body.data as { generatedAt: string }).generatedAt
              : new Date().toISOString(),
        });
      }
      if (typeof body.data?.walletBalanceAfter === "number") {
        setWalletBalance(body.data.walletBalanceAfter);
      }
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
    setCopySuccessMessage(null);
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
        code?: string;
        requiredCredits?: number;
        availableCredits?: number;
        data?: {
          generationId?: string;
          version?: number;
          model?: string;
          locale?: string | null;
          generatedAt?: string;
          walletBalanceAfter?: number;
          content?: { keywords?: string[] };
        };
      };

      if (!response.ok || !body.data?.content?.keywords) {
        throw new Error(getApiErrorMessage(body, "Failed to generate keywords"));
      }
      const keywordItems = body.data.content.keywords;

      setDrafts((prev) => ({
        ...prev,
        KEYWORDS: parseKeywordsFromUnknown(keywordItems).join(", "),
      }));
      if (body.data?.generationId && body.data?.version && body.data?.model) {
        appendVersionHistory({
          id: body.data.generationId,
          type: "KEYWORDS",
          locale: "locale" in body.data ? ((body.data as { locale?: string }).locale ?? null) : null,
          version: body.data.version,
          model: body.data.model,
          generatedAt:
            "generatedAt" in body.data && typeof (body.data as { generatedAt?: unknown }).generatedAt === "string"
              ? (body.data as { generatedAt: string }).generatedAt
              : new Date().toISOString(),
        });
      }
      if (typeof body.data?.walletBalanceAfter === "number") {
        setWalletBalance(body.data.walletBalanceAfter);
      }
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
    setCopySuccessMessage(null);
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
        code?: string;
        requiredCredits?: number;
        availableCredits?: number;
        data?: {
          generationId?: string;
          version?: number;
          model?: string;
          locale?: string | null;
          generatedAt?: string;
          walletBalanceAfter?: number;
          content?: { captions?: string[] };
        };
      };

      if (!response.ok || !body.data?.content?.captions) {
        throw new Error(getApiErrorMessage(body, "Failed to generate screenshot captions"));
      }
      const captionItems = body.data.content.captions;

      setDrafts((prev) => ({
        ...prev,
        SCREENSHOT_CAPTIONS: parseCaptionsFromUnknown(captionItems).join("\n"),
      }));
      if (body.data?.generationId && body.data?.version && body.data?.model) {
        appendVersionHistory({
          id: body.data.generationId,
          type: "SCREENSHOT_CAPTIONS",
          locale: "locale" in body.data ? ((body.data as { locale?: string }).locale ?? null) : null,
          version: body.data.version,
          model: body.data.model,
          generatedAt:
            "generatedAt" in body.data && typeof (body.data as { generatedAt?: unknown }).generatedAt === "string"
              ? (body.data as { generatedAt: string }).generatedAt
              : new Date().toISOString(),
        });
      }
      if (typeof body.data?.walletBalanceAfter === "number") {
        setWalletBalance(body.data.walletBalanceAfter);
      }
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
    setCopySuccessMessage(null);
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
        code?: string;
        requiredCredits?: number;
        availableCredits?: number;
        data?: {
          generationId?: string;
          version?: number;
          model?: string;
          locale?: string | null;
          generatedAt?: string;
          walletBalanceAfter?: number;
          content?: { title?: string; notes?: string[] };
        };
      };

      if (!response.ok || !body.data?.content) {
        throw new Error(getApiErrorMessage(body, "Failed to generate update notes"));
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
      if (body.data?.generationId && body.data?.version && body.data?.model) {
        appendVersionHistory({
          id: body.data.generationId,
          type: "UPDATE_NOTES",
          locale: "locale" in body.data ? ((body.data as { locale?: string }).locale ?? null) : null,
          version: body.data.version,
          model: body.data.model,
          generatedAt:
            "generatedAt" in body.data && typeof (body.data as { generatedAt?: unknown }).generatedAt === "string"
              ? (body.data as { generatedAt: string }).generatedAt
              : new Date().toISOString(),
        });
      }
      if (typeof body.data?.walletBalanceAfter === "number") {
        setWalletBalance(body.data.walletBalanceAfter);
      }
    } catch (error) {
      setUpdateNotesError(error instanceof Error ? error.message : "Failed to generate update notes");
    } finally {
      setIsGeneratingUpdateNotes(false);
      setIsTabLoading(false);
    }
  }

  async function runLocalizationGeneration() {
    setLocalizationError(null);
    setCopied(false);
    setCopySuccessMessage(null);

    if (!targetLocale) {
      setLocalizationError("Select a target locale first");
      return;
    }

    if (!localizationSourceContent) {
      setLocalizationError("Source asset has no valid content to localize");
      return;
    }

    setIsGeneratingLocalization(true);
    setIsTabLoading(true);

    try {
      const response = await fetch("/api/generate/localization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          sourceAssetType: localizationSourceAsset,
          sourceContent: localizationSourceContent,
          targetLocale,
        }),
      });

      const body = (await response.json()) as {
        error?: string;
        details?: string;
        code?: string;
        requiredCredits?: number;
        availableCredits?: number;
        data?: {
          generationId?: string;
          version?: number;
          model?: string;
          locale?: string | null;
          generatedAt?: string;
          walletBalanceAfter?: number;
          content?: Record<string, unknown>;
        };
      };

      if (!response.ok || !body.data?.content) {
        throw new Error(getApiErrorMessage(body, "Failed to generate localization"));
      }
      const localizedContent = body.data.content;

      setDrafts((prev) => ({
        ...prev,
        LOCALIZATION: JSON.stringify(localizedContent, null, 2),
      }));
      if (body.data?.generationId && body.data?.version && body.data?.model) {
        appendVersionHistory({
          id: body.data.generationId,
          type: "LOCALIZATION",
          locale:
            "locale" in body.data && typeof (body.data as { locale?: unknown }).locale === "string"
              ? (body.data as { locale: string }).locale
              : targetLocale,
          version: body.data.version,
          model: body.data.model,
          generatedAt:
            "generatedAt" in body.data && typeof (body.data as { generatedAt?: unknown }).generatedAt === "string"
              ? (body.data as { generatedAt: string }).generatedAt
              : new Date().toISOString(),
        });
      }
      if (typeof body.data?.walletBalanceAfter === "number") {
        setWalletBalance(body.data.walletBalanceAfter);
      }
    } catch (error) {
      setLocalizationError(error instanceof Error ? error.message : "Failed to generate localization");
    } finally {
      setIsGeneratingLocalization(false);
      setIsTabLoading(false);
    }
  }

  async function runGenerateAll() {
    setGenerateAllNotice(null);
    setCopied(false);
    setCopySuccessMessage(null);
    setDescriptionError(null);
    setKeywordsError(null);
    setCaptionsError(null);
    setUpdateNotesError(null);
    setLocalizationError(null);
    setIsGeneratingAll(true);
    setIsTabLoading(true);

    try {
      const response = await fetch("/api/generate/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          updateNotesMode,
        }),
      });

      const body = (await response.json()) as {
        error?: string;
        details?: string;
        code?: string;
        requiredCredits?: number;
        availableCredits?: number;
        data?: {
          assets?: {
            description?: GenerateAllAssetResponse;
            keywords?: GenerateAllAssetResponse;
            screenshotCaptions?: GenerateAllAssetResponse;
            updateNotes?: GenerateAllAssetResponse;
          };
          summary?: {
            successCount?: number;
            failureCount?: number;
            chargedCredits?: number;
          };
        };
      };

      if (!response.ok || !body.data?.assets) {
        throw new Error(getApiErrorMessage(body, "Generate all failed"));
      }

      const assets = body.data.assets;
      const failures: string[] = [];

      if (assets.description?.status === "error") {
        failures.push(`Description: ${assets.description.error}`);
        setDescriptionError(assets.description.error);
      }
      if (assets.keywords?.status === "error") {
        failures.push(`Keywords: ${assets.keywords.error}`);
        setKeywordsError(assets.keywords.error);
      }
      if (assets.screenshotCaptions?.status === "error") {
        failures.push(`Screenshot Captions: ${assets.screenshotCaptions.error}`);
        setCaptionsError(assets.screenshotCaptions.error);
      }
      if (assets.updateNotes?.status === "error") {
        failures.push(`Update Notes: ${assets.updateNotes.error}`);
        setUpdateNotesError(assets.updateNotes.error);
      }

      const newHistoryEntries: VersionHistoryItem[] = [];
      setDrafts((prev) => {
        const next = { ...prev };

        if (assets.description?.status === "success") {
          next.DESCRIPTION = JSON.stringify(assets.description.content, null, 2);
          newHistoryEntries.push({
            id: assets.description.generationId,
            type: "DESCRIPTION",
            locale: assets.description.locale ?? null,
            version: assets.description.version,
            model: assets.description.model,
            generatedAt: assets.description.generatedAt,
          });
        }
        if (assets.keywords?.status === "success") {
          next.KEYWORDS = parseKeywordsFromUnknown(assets.keywords.content.keywords).join(", ");
          newHistoryEntries.push({
            id: assets.keywords.generationId,
            type: "KEYWORDS",
            locale: assets.keywords.locale ?? null,
            version: assets.keywords.version,
            model: assets.keywords.model,
            generatedAt: assets.keywords.generatedAt,
          });
        }
        if (assets.screenshotCaptions?.status === "success") {
          next.SCREENSHOT_CAPTIONS = parseCaptionsFromUnknown(assets.screenshotCaptions.content.captions).join(
            "\n",
          );
          newHistoryEntries.push({
            id: assets.screenshotCaptions.generationId,
            type: "SCREENSHOT_CAPTIONS",
            locale: assets.screenshotCaptions.locale ?? null,
            version: assets.screenshotCaptions.version,
            model: assets.screenshotCaptions.model,
            generatedAt: assets.screenshotCaptions.generatedAt,
          });
        }
        if (assets.updateNotes?.status === "success") {
          next.UPDATE_NOTES = formatUpdateNotesForEditor(parseUpdateNotesFromUnknown(assets.updateNotes.content));
          newHistoryEntries.push({
            id: assets.updateNotes.generationId,
            type: "UPDATE_NOTES",
            locale: assets.updateNotes.locale ?? null,
            version: assets.updateNotes.version,
            model: assets.updateNotes.model,
            generatedAt: assets.updateNotes.generatedAt,
          });
        }

        return next;
      });
      newHistoryEntries.forEach(appendVersionHistory);

      const summary = body.data.summary;
      const successfulAssets = Object.values(assets).filter(
        (asset): asset is Extract<GenerateAllAssetResponse, { status: "success" }> => asset?.status === "success",
      );
      if (successfulAssets.length > 0) {
        const minBalanceAfter = successfulAssets.reduce(
          (min, asset) => Math.min(min, asset.walletBalanceAfter),
          successfulAssets[0].walletBalanceAfter,
        );
        setWalletBalance(minBalanceAfter);
      }

      if (failures.length === 0) {
        setGenerateAllNotice({
          type: "success",
          message: `Generated all assets successfully (${summary?.successCount ?? 4}/4). Charged ${
            summary?.chargedCredits ?? 0
          } credits.`,
        });
      } else {
        setGenerateAllNotice({
          type: "partial",
          message: `Generate all completed with partial errors (${summary?.successCount ?? 0} success, ${
            summary?.failureCount ?? failures.length
          } failed). Charged ${summary?.chargedCredits ?? 0} credits. ${failures.join(" | ")}`,
        });
      }
    } catch (error) {
      setGenerateAllNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Generate all failed",
      });
    } finally {
      setIsGeneratingAll(false);
      setIsTabLoading(false);
    }
  }

  async function handleRestoreVersion(generationId: string) {
    setRestoreError(null);
    setCopied(false);
    setCopySuccessMessage(null);
    setRestoringVersionId(generationId);
    setIsTabLoading(true);

    try {
      const response = await fetch(`/api/generate/${generationId}/restore`, {
        method: "POST",
      });
      const body = (await response.json()) as {
        error?: string;
        details?: string;
        data?: {
          generationId: string;
          type: WorkspaceTabType;
          locale: string | null;
          version: number;
          model: string;
          generatedAt: string;
          content: unknown;
        };
      };

      if (!response.ok || !body.data) {
        throw new Error(body.error || body.details || "Failed to restore selected version");
      }

      const restored = body.data;

      setDrafts((prev) => ({
        ...prev,
        [restored.type]: formatDraftForTab(restored.type, restored.content),
      }));
      appendVersionHistory({
        id: restored.generationId,
        type: restored.type,
        locale: restored.locale,
        version: restored.version,
        model: restored.model,
        generatedAt: restored.generatedAt,
      });
    } catch (error) {
      setRestoreError(error instanceof Error ? error.message : "Failed to restore selected version");
    } finally {
      setRestoringVersionId(null);
      setIsTabLoading(false);
    }
  }

  function handleTabChange(nextTab: WorkspaceTabType) {
    if (nextTab === activeTab) return;

    setCopied(false);
    setCopySuccessMessage(null);
    if (nextTab !== "DESCRIPTION") setDescriptionError(null);
    if (nextTab !== "KEYWORDS") setKeywordsError(null);
    if (nextTab !== "SCREENSHOT_CAPTIONS") setCaptionsError(null);
    if (nextTab !== "UPDATE_NOTES") setUpdateNotesError(null);
    if (nextTab !== "LOCALIZATION") setLocalizationError(null);
    setRestoreError(null);

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
            Switch between tabs, edit content, and copy output. Description, Keywords, Screenshot Captions, Update Notes, and Localization are connected.
          </CardDescription>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={runGenerateAll}
            disabled={areGenerationButtonsDisabled || !canAffordGenerateAll}
            title={generateAllTooltip}
          >
            <WandSparkles className="mr-2 h-4 w-4" />
            {isGeneratingAll ? "Generating All..." : "Generate All"}
          </Button>
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
                  ? "border-lime-300 bg-lime-100 text-lime-900 shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-lime-50/70",
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={isAnyGenerationRunning || isEmpty || isTabLoading}
            >
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "Copied" : "Copy"}
            </Button>

            {activeTab === "DESCRIPTION" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={areGenerationButtonsDisabled || !canAffordActiveGeneration}
                onClick={handleRegenerateDescription}
                title={descriptionTooltip}
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
                  disabled={
                    areGenerationButtonsDisabled ||
                    keywordsMeta.keywords.length > 0 ||
                    walletBalance < ASSET_GENERATION_COSTS.KEYWORDS
                  }
                  onClick={runKeywordsGeneration}
                  title={keywordsTooltip}
                >
                  <WandSparkles className="mr-2 h-4 w-4" />
                  {isGeneratingKeywords ? "Generating..." : "Generate Keywords"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={areGenerationButtonsDisabled || walletBalance < ASSET_GENERATION_COSTS.KEYWORDS}
                  onClick={runKeywordsGeneration}
                  title={keywordsTooltip}
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
                  disabled={
                    areGenerationButtonsDisabled ||
                    captionsMeta.captions.length > 0 ||
                    walletBalance < ASSET_GENERATION_COSTS.SCREENSHOT_CAPTIONS
                  }
                  onClick={runCaptionsGeneration}
                  title={captionsTooltip}
                >
                  <WandSparkles className="mr-2 h-4 w-4" />
                  {isGeneratingCaptions ? "Generating..." : "Generate Captions"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={areGenerationButtonsDisabled || walletBalance < ASSET_GENERATION_COSTS.SCREENSHOT_CAPTIONS}
                  onClick={runCaptionsGeneration}
                  title={captionsTooltip}
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
                  disabled={
                    areGenerationButtonsDisabled ||
                    updateNotesMeta.notes.length > 0 ||
                    walletBalance < ASSET_GENERATION_COSTS.UPDATE_NOTES
                  }
                  onClick={runUpdateNotesGeneration}
                  title={updateNotesTooltip}
                >
                  <WandSparkles className="mr-2 h-4 w-4" />
                  {isGeneratingUpdateNotes ? "Generating..." : "Generate Update Notes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={areGenerationButtonsDisabled || walletBalance < ASSET_GENERATION_COSTS.UPDATE_NOTES}
                  onClick={runUpdateNotesGeneration}
                  title={updateNotesTooltip}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {isGeneratingUpdateNotes ? "Regenerating..." : "Regenerate Update Notes"}
                </Button>
              </>
            ) : null}

            {activeTab === "LOCALIZATION" ? (
              <>
                <Select
                  value={localizationSourceAsset}
                  onValueChange={(value) => setLocalizationSourceAsset(value as LocalizableSourceAssetType)}
                >
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Source asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {localizationSourceAssetOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={targetLocale} onValueChange={setTargetLocale}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Locale" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLocales.map((locale) => (
                      <SelectItem key={locale} value={locale}>
                        {locale}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    areGenerationButtonsDisabled ||
                    !localizationSourceContent ||
                    walletBalance < ASSET_GENERATION_COSTS.LOCALIZATION
                  }
                  onClick={runLocalizationGeneration}
                  title={localizationTooltip}
                >
                  <WandSparkles className="mr-2 h-4 w-4" />
                  {isGeneratingLocalization ? "Generating..." : "Generate Localization"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    areGenerationButtonsDisabled ||
                    !localizationSourceContent ||
                    walletBalance < ASSET_GENERATION_COSTS.LOCALIZATION
                  }
                  onClick={runLocalizationGeneration}
                  title={localizationTooltip}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {isGeneratingLocalization ? "Regenerating..." : "Regenerate Localization"}
                </Button>
              </>
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

        {localizationError && activeTab === "LOCALIZATION" ? (
          <p className="text-sm text-red-600">{localizationError}</p>
        ) : null}

        {generateAllNotice ? (
          <p
            className={cn(
              "text-sm",
              generateAllNotice.type === "success"
                ? "text-green-700"
                : generateAllNotice.type === "partial"
                  ? "text-amber-700"
                  : "text-red-600",
            )}
          >
            {generateAllNotice.message}
          </p>
        ) : null}

        {restoreError ? <p className="text-sm text-red-600">{restoreError}</p> : null}
        {copySuccessMessage ? (
          <p className="inline-flex items-center gap-1 text-xs text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {copySuccessMessage}
          </p>
        ) : null}

        {!isTabLoading ? (
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span>
              Wallet balance: <span className="font-medium text-slate-900">{walletBalance}</span> credits
            </span>
            <span>
              Current action cost: <span className="font-medium text-slate-900">{activeGenerationCost}</span> credits
            </span>
            <span>
              Generate All cost: <span className="font-medium text-slate-900">{GENERATE_ALL_COST}</span> credits
            </span>
          </div>
        ) : null}

        {!isTabLoading && !canAffordActiveGeneration ? (
          <p className="text-xs text-red-600">
            Not enough credits for this generation action. Add credits in Settings to continue.
          </p>
        ) : null}

        {!isTabLoading && !canAffordGenerateAll ? (
          <p className="text-xs text-amber-700">
            Generate All is disabled because your balance is below {GENERATE_ALL_COST} credits.
          </p>
        ) : null}

        {!isTabLoading ? (
          <div className="text-xs text-slate-600">{activeValidation.characterCount} characters</div>
        ) : null}

        {activeValidation.errors.length > 0 && !isTabLoading ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <p className="font-medium">Please fix the following:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {activeValidation.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {activeValidation.warnings.length > 0 && !isTabLoading ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <ul className="list-disc space-y-0.5 pl-4">
              {activeValidation.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
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
            {updateNotesMeta.notes.length} notes · title {updateNotesMeta.title ? "set" : "missing"} ·{" "}
            {updateNotesValidation.characterCount} / {UPDATE_NOTES_MAX_TOTAL_CHARS} chars
          </div>
        ) : null}

        {activeTab === "LOCALIZATION" && !isTabLoading ? (
          <div className="text-xs text-slate-600">
            Localizing <span className="font-medium">{localizationSourceAsset.replaceAll("_", " ")}</span> to{" "}
            <span className="font-medium">{targetLocale}</span>
            {localizationSourceContent ? "" : " · source asset needs content first"} ·{" "}
            {localizationValidation.characterCount} / {LOCALIZATION_MAX_CHARS} chars
          </div>
        ) : null}

        {activeTab === "DESCRIPTION" && !isTabLoading ? (
          <div className="text-xs text-slate-600">
            Description content target: up to {DESCRIPTION_MAX_CHARS} chars in <span className="font-medium">fullText</span>.
          </div>
        ) : null}

        {isTabLoading ? (
          <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Loading {activeLabel.toLowerCase()} editor...</p>
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-56 animate-pulse rounded-md bg-slate-100" />
          </div>
        ) : (
          <>
            {isEmpty ? (
              <Card className="border-dashed bg-slate-50">
                <CardContent className="p-4 text-sm text-slate-600">
                  {activeTab === "KEYWORDS"
                    ? "No keywords yet. Generate a first set, then refine manually."
                    : activeTab === "SCREENSHOT_CAPTIONS"
                      ? "No captions yet. Generate marketing-friendly captions and edit inline."
                      : activeTab === "UPDATE_NOTES"
                        ? "No update notes yet. Pick a release mode and generate a first draft."
                        : activeTab === "LOCALIZATION"
                          ? "No localized content yet. Choose a source asset and target locale, then generate."
                        : "No description yet. Generate one or paste a structured JSON draft to begin."}
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
              className={cn(
                "min-h-72 font-mono text-sm",
                activeValidation.errors.length > 0 ? "border-red-300 focus-visible:ring-red-500" : undefined,
              )}
              placeholder={
                activeTab === "KEYWORDS"
                  ? "keyword one, keyword two, keyword three"
                  : activeTab === "SCREENSHOT_CAPTIONS"
                    ? "Capture your progress in seconds\nStay focused with smart reminders"
                    : activeTab === "UPDATE_NOTES"
                      ? "Title: What's New\n- Improved onboarding performance\n- Fixed reminder sync issue"
                      : activeTab === "LOCALIZATION"
                        ? '{\n  "localizedField": "value"\n}'
                      : `Write ${activeLabel.toLowerCase()} content here...`
              }
            />

            <div className="space-y-2 rounded-md border border-slate-200 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <History className="h-4 w-4" />
                Version History
                {activeTab === "LOCALIZATION" ? (
                  <span className="text-xs font-normal text-slate-500">({targetLocale})</span>
                ) : null}
              </div>

              {visibleVersionHistory.length === 0 ? (
                <p className="text-xs text-slate-500">No generated versions for this asset yet.</p>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {visibleVersionHistory.map((entry) => {
                    const isCurrent = entry.id === activeVersionId;
                    const isRestoringThis = restoringVersionId === entry.id;

                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          "flex items-start justify-between gap-3 rounded-md border p-2",
                          isCurrent ? "border-lime-300 bg-lime-50/70" : "border-slate-200",
                        )}
                      >
                        <div className="space-y-1 text-xs text-slate-600">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">v{entry.version}</span>
                            {isCurrent ? <Badge variant="secondary">Current</Badge> : null}
                          </div>
                          <p>Model: {entry.model}</p>
                          <p>Generated: {formatTimestamp(entry.generatedAt)}</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={areGenerationButtonsDisabled || isCurrent}
                          onClick={() => handleRestoreVersion(entry.id)}
                        >
                          {isRestoringThis ? "Restoring..." : isCurrent ? "Current" : "Restore"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
