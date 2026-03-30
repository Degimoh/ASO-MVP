import { CreateProjectRHFForm } from "@/components/dashboard/create-project-rhf-form";
import { PageShell } from "@/components/dashboard/page-shell";

export default function CreateProjectPage() {
  return (
    <PageShell
      title="Create Project"
      description="Set up app context and save a project to unlock polished, AI-powered ASO generation."
    >
      <CreateProjectRHFForm />
    </PageShell>
  );
}
