import { NextResponse } from "next/server";
import { getProjectById } from "@/lib/repositories/project-repository";
import { buildProjectExport, buildTxtExport } from "@/lib/services/export-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";

  const project = await getProjectById(projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (format === "txt") {
    const txt = buildTxtExport(project);

    return new NextResponse(txt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${project.appName}-aso-assets.txt"`,
      },
    });
  }

  const exported = buildProjectExport(project);

  return new NextResponse(JSON.stringify(exported, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${project.appName}-aso-assets.json"`,
    },
  });
}
