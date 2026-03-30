import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import { writeUsageLog } from "@/lib/repositories/generation-repository";
import { requireApiUser } from "@/src/lib/auth/api";
import { getProjectByIdForUser } from "@/src/lib/repositories/project.repository";
import { listScreenshotCreativesByProjectIdForUser } from "@/src/lib/repositories/screenshot.repository";

function safeFileNamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function filePathFromStoragePath(storagePath: string) {
  return path.join(process.cwd(), "public", storagePath.replace(/^\//, ""));
}

export async function GET(
  _request: Request,
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

    const creatives = await listScreenshotCreativesByProjectIdForUser({
      projectId: project.id,
      userId: auth.user.id,
    });
    const available = creatives.filter((item) => typeof item.storagePath === "string" && item.storagePath.length > 0);
    if (available.length === 0) {
      return NextResponse.json({ error: "No generated PNG files found" }, { status: 404 });
    }

    const zip = new JSZip();
    for (let index = 0; index < available.length; index += 1) {
      const creative = available[index];
      if (!creative.storagePath) continue;
      const buffer = await readFile(filePathFromStoragePath(creative.storagePath));
      const filename = `${String(index + 1).padStart(2, "0")}-${safeFileNamePart(project.appName)}-${creative.screenshotId}.png`;
      zip.file(filename, buffer);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    await writeUsageLog({
      userId: auth.user.id,
      projectId: project.id,
      action: "export_screenshot_creatives_zip",
      status: "success",
      latencyMs: Date.now() - startedAt,
      metadata: {
        filesCount: available.length,
      },
    });

    const zipBytes = new Uint8Array(zipBuffer);
    return new NextResponse(zipBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeFileNamePart(project.appName) || "project"}-screenshot-creatives.zip"`,
      },
    });
  } catch (error) {
    await writeUsageLog({
      userId: auth.user.id,
      action: "export_screenshot_creatives_zip",
      status: "error",
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error: "Failed to export screenshot creatives ZIP",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
