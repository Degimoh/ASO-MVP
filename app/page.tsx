import { redirect } from "next/navigation";
import { getCurrentUserFromSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUserFromSession();
  redirect(user ? "/dashboard/projects" : "/login");
}
