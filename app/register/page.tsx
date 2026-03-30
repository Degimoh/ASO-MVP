import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUserFromSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await getCurrentUserFromSession();

  if (user) {
    redirect("/dashboard/projects");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <RegisterForm />
    </main>
  );
}
