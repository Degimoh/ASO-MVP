import { NextResponse } from "next/server";
import { requireApiUser } from "@/src/lib/auth/api";
import { getProjectWorkspaceById } from "@/src/lib/repositories/project.repository";
import {
  buildExportFilename,
  buildProjectExportJson,
  buildProjectExportTxt,
  parseProjectExportFormat,
} from "@/src/lib/services/project-export.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.user) {
    return auth.unauthorizedResponse;
  }

  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const format = parseProjectExportFormat(searchParams.get("format"));

  const project = await getProjectWorkspaceById(projectId);

  if (!project || project.userId !== auth.user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (format === "txt") {
    const txt = buildProjectExportTxt(project);

    return new NextResponse(txt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${buildExportFilename(project.appName, "txt")}"`,
      },
    });
  }

  const exported = buildProjectExportJson(project);

  return new NextResponse(JSON.stringify(exported, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${buildExportFilename(project.appName, "json")}"`,
    },
  });
}
