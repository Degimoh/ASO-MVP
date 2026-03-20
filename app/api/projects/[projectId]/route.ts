import { NextResponse } from "next/server";
import { getProjectById, mapProjectResponse } from "@/lib/repositories/project-repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ data: mapProjectResponse(project) });
}
