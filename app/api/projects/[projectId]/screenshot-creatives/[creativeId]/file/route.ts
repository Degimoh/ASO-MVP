import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/src/lib/auth/api";
import { getScreenshotCreativeByIdForUser } from "@/src/lib/repositories/screenshot.repository";

function filePathFromStoragePath(storagePath: string) {
  return path.join(process.cwd(), "public", storagePath.replace(/^\//, ""));
}

function inferMimeType(storagePath: string) {
  const lower = storagePath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; creativeId: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.user) {
    return auth.unauthorizedResponse;
  }

  const { projectId, creativeId } = await params;
  const creative = await getScreenshotCreativeByIdForUser({
    creativeId,
    userId: auth.user.id,
  });
  if (!creative || creative.projectId !== projectId || !creative.storagePath) {
    return NextResponse.json({ error: "Creative file not found" }, { status: 404 });
  }

  try {
    const absolutePath = filePathFromStoragePath(creative.storagePath);
    const fileBuffer = await readFile(absolutePath);
    const mimeType = inferMimeType(creative.storagePath);

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Creative file not found" }, { status: 404 });
  }
}
