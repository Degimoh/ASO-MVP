import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { writeUsageLog } from "@/lib/repositories/generation-repository";
import { requireApiUser } from "@/src/lib/auth/api";
import { getProjectByIdForUser } from "@/src/lib/repositories/project.repository";
import {
  createProjectScreenshot,
  deleteProjectScreenshotByIdForUser,
  getProjectScreenshotByIdForUser,
  listProjectScreenshotsByProjectIdForUser,
} from "@/src/lib/repositories/screenshot.repository";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function normalizeFilename(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function filePathFromStoragePath(storagePath: string) {
  return path.join(process.cwd(), "public", storagePath.replace(/^\//, ""));
}

async function safeUnlink(storagePath: string | null | undefined) {
  if (!storagePath) return;
  try {
    await unlink(filePathFromStoragePath(storagePath));
  } catch {
    // Best effort cleanup only.
  }
}

function toUploadErrorPayload(error: unknown) {
  const details = error instanceof Error ? error.message : "Unknown error";
  const normalized = details.toLowerCase();

  if (
    (normalized.includes("projectscreenshot") || normalized.includes("screenshotcreative")) &&
    (normalized.includes("does not exist") || normalized.includes("relation"))
  ) {
    return {
      error: "Screenshot tables are missing in the database",
      details:
        "Apply latest Prisma migrations on this environment (including 0004_screenshot_creatives). Run: npx prisma migrate deploy",
      code: "MIGRATION_REQUIRED",
    };
  }

  return {
    error: "Failed to upload screenshots",
    details,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.user) {
    return auth.unauthorizedResponse;
  }

  const { projectId } = await params;
  const project = await getProjectByIdForUser(projectId, auth.user.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const screenshots = await listProjectScreenshotsByProjectIdForUser(projectId, auth.user.id);
  return NextResponse.json({
    data: screenshots.map((item) => ({
      id: item.id,
      originalFilename: item.originalFilename,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      width: item.width,
      height: item.height,
      storagePath: item.storagePath,
      createdAt: item.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.user) {
    return auth.unauthorizedResponse;
  }

  const startedAt = Date.now();

  try {
    const { projectId } = await params;
    const project = await getProjectByIdForUser(projectId, auth.user.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ error: "No screenshot files uploaded" }, { status: 400 });
    }

    const created = [];
    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          {
            error: `Unsupported file type: ${file.type || "unknown"}. Use PNG, JPEG, or WEBP.`,
          },
          { status: 400 },
        );
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds 8 MB limit.` },
          { status: 400 },
        );
      }

      const rawBuffer = Buffer.from(await file.arrayBuffer());
      const metadata = await sharp(rawBuffer).metadata();
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const filename = `${projectId}-${randomUUID()}-${normalizeFilename(file.name || "screenshot")}.${ext}`;
      const relativePath = `/uploads/screenshots/${filename}`;
      const absolutePath = path.join(process.cwd(), "public", relativePath.replace(/^\//, ""));
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, rawBuffer);

      const dbItem = await createProjectScreenshot({
        projectId: project.id,
        originalFilename: file.name || filename,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        storagePath: relativePath,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
      });
      created.push({
        id: dbItem.id,
        originalFilename: dbItem.originalFilename,
        mimeType: dbItem.mimeType,
        sizeBytes: dbItem.sizeBytes,
        width: dbItem.width,
        height: dbItem.height,
        storagePath: dbItem.storagePath,
        createdAt: dbItem.createdAt.toISOString(),
      });
    }

    await writeUsageLog({
      userId: auth.user.id,
      projectId: project.id,
      action: "upload_screenshots",
      status: "success",
      latencyMs: Date.now() - startedAt,
      metadata: {
        uploadedCount: created.length,
      },
    });

    return NextResponse.json(
      {
        data: created,
      },
      { status: 201 },
    );
  } catch (error) {
    await writeUsageLog({
      userId: auth.user.id,
      action: "upload_screenshots",
      status: "error",
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(toUploadErrorPayload(error), { status: 500 });
  }
}

const screenshotMutationSchema = {
  delete: (payload: unknown) => {
    if (typeof payload !== "object" || payload === null || !("screenshotId" in payload)) {
      return { valid: false as const };
    }
    const screenshotId = (payload as { screenshotId?: unknown }).screenshotId;
    if (typeof screenshotId !== "string" || screenshotId.trim().length === 0) {
      return { valid: false as const };
    }
    return { valid: true as const, screenshotId: screenshotId.trim() };
  },
};

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.user) {
    return auth.unauthorizedResponse;
  }

  const startedAt = Date.now();

  try {
    const { projectId } = await params;
    const project = await getProjectByIdForUser(projectId, auth.user.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = screenshotMutationSchema.delete(body);
    if (!parsed.valid) {
      return NextResponse.json({ error: "screenshotId is required" }, { status: 400 });
    }

    const deleted = await deleteProjectScreenshotByIdForUser({
      screenshotId: parsed.screenshotId,
      userId: auth.user.id,
    });
    if (!deleted || deleted.id === "") {
      return NextResponse.json({ error: "Screenshot not found" }, { status: 404 });
    }

    await safeUnlink(deleted.storagePath);
    await Promise.all(deleted.creatives.map((item) => safeUnlink(item.storagePath)));

    await writeUsageLog({
      userId: auth.user.id,
      projectId: project.id,
      action: "delete_screenshot",
      status: "success",
      latencyMs: Date.now() - startedAt,
      metadata: { screenshotId: parsed.screenshotId },
    });

    return NextResponse.json({
      data: {
        screenshotId: parsed.screenshotId,
        deleted: true,
      },
    });
  } catch (error) {
    await writeUsageLog({
      userId: auth.user.id,
      action: "delete_screenshot",
      status: "error",
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      {
        error: "Failed to delete screenshot",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.user) {
    return auth.unauthorizedResponse;
  }

  const startedAt = Date.now();

  try {
    const { projectId } = await params;
    const project = await getProjectByIdForUser(projectId, auth.user.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const screenshotId = String(formData.get("screenshotId") || "").trim();
    const replacementFile = formData.get("file");

    if (!screenshotId) {
      return NextResponse.json({ error: "screenshotId is required" }, { status: 400 });
    }
    if (!(replacementFile instanceof File) || replacementFile.size <= 0) {
      return NextResponse.json({ error: "Replacement file is required" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(replacementFile.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${replacementFile.type || "unknown"}. Use PNG, JPEG, or WEBP.` },
        { status: 400 },
      );
    }
    if (replacementFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File ${replacementFile.name} exceeds 8 MB limit.` },
        { status: 400 },
      );
    }

    const existing = await getProjectScreenshotByIdForUser({
      screenshotId,
      userId: auth.user.id,
    });
    if (!existing || existing.projectId !== project.id) {
      return NextResponse.json({ error: "Screenshot not found" }, { status: 404 });
    }

    const rawBuffer = Buffer.from(await replacementFile.arrayBuffer());
    const metadata = await sharp(rawBuffer).metadata();
    const ext =
      replacementFile.type === "image/png"
        ? "png"
        : replacementFile.type === "image/webp"
          ? "webp"
          : "jpg";
    const filename = `${projectId}-${randomUUID()}-${normalizeFilename(replacementFile.name || "screenshot")}.${ext}`;
    const relativePath = `/uploads/screenshots/${filename}`;
    const absolutePath = filePathFromStoragePath(relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, rawBuffer);

    const deleted = await deleteProjectScreenshotByIdForUser({
      screenshotId,
      userId: auth.user.id,
    });
    if (deleted) {
      await safeUnlink(deleted.storagePath);
      await Promise.all(deleted.creatives.map((item) => safeUnlink(item.storagePath)));
    }

    const dbItem = await createProjectScreenshot({
      projectId: project.id,
      originalFilename: replacementFile.name || filename,
      mimeType: replacementFile.type || "application/octet-stream",
      sizeBytes: replacementFile.size,
      storagePath: relativePath,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
    });

    await writeUsageLog({
      userId: auth.user.id,
      projectId: project.id,
      action: "replace_screenshot",
      status: "success",
      latencyMs: Date.now() - startedAt,
      metadata: {
        replacedScreenshotId: screenshotId,
        newScreenshotId: dbItem.id,
      },
    });

    return NextResponse.json({
      data: {
        id: dbItem.id,
        originalFilename: dbItem.originalFilename,
        mimeType: dbItem.mimeType,
        sizeBytes: dbItem.sizeBytes,
        width: dbItem.width,
        height: dbItem.height,
        storagePath: dbItem.storagePath,
        createdAt: dbItem.createdAt.toISOString(),
      },
    });
  } catch (error) {
    await writeUsageLog({
      userId: auth.user.id,
      action: "replace_screenshot",
      status: "error",
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      {
        error: "Failed to replace screenshot",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
