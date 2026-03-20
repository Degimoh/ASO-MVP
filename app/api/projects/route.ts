import { NextResponse } from "next/server";
import { createProject, getOrCreateDemoUser, listProjectsForUser, mapProjectResponse } from "@/lib/repositories/project-repository";
import { projectPayloadSchema } from "@/lib/validations/project";

export async function GET() {
  const user = await getOrCreateDemoUser();
  const projects = await listProjectsForUser(user.id);

  return NextResponse.json({
    data: projects.map((project) => mapProjectResponse(project)),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = projectPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const user = await getOrCreateDemoUser();
    const project = await createProject(user.id, parsed.data);

    return NextResponse.json({ data: mapProjectResponse(project) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create project", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
