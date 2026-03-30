import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/src/lib/auth/api";
import { getProjectScreenshotByIdForUser } from "@/src/lib/repositories/screenshot.repository";

function filePathFromStoragePath(storagePath: string) {
  return path.join(process.cwd(), "public", storagePath.replace(/^\//, ""));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; screenshotId: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.user) {
    return auth.unauthorizedResponse;
  }

  const { projectId, screenshotId } = await params;
  const screenshot = await getProjectScreenshotByIdForUser({
    screenshotId,
    userId: auth.user.id,
  });

  if (!screenshot || screenshot.projectId !== projectId) {
    return NextResponse.json({ error: "Screenshot not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(filePathFromStoragePath(screenshot.storagePath));
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": screenshot.mimeType || "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Screenshot file missing" }, { status: 404 });
  }
}
