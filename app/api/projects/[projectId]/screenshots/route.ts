import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { writeUsageLog } from "@/lib/repositories/generation-repository";
import { requireApiUser } from "@/src/lib/auth/api";
import { getProjectByIdForUser } from "@/src/lib/repositories/project.repository";
import {
  createProjectScreenshot,
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

    return NextResponse.json(
      {
        error: "Failed to upload screenshots",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
