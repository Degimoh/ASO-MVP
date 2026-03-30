import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUserFromSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUserFromSession();

  if (user) {
    redirect("/dashboard/projects");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <div className="w-full">
        <div className="mb-6 space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-700/80">
            Welcome Back
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">AI ASO Generator</h1>
          <p className="text-sm text-slate-600">Sign in to continue improving your App Store performance.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
