import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserFromSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUserFromSession();
  if (user) {
    redirect("/dashboard/projects");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-12">
      <div className="w-full space-y-8">
        <div className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-700/80 dark:text-lime-300/90">
            AI ASO Generator
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-lime-100 sm:text-5xl">
            ASO-сервис для инди-разработчиков и крупных mobile-команд
          </h1>
          <p className="mx-auto max-w-3xl text-base text-slate-700 dark:text-lime-100/80 sm:text-lg">
            Создавайте описания, keywords, captions, update notes и локализацию в одном рабочем пространстве, чтобы
            быстрее выпускать и масштабировать мобильные продукты.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Rocket className="h-5 w-5 text-lime-700 dark:text-lime-300" />
                Для indie-разработчиков
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700 dark:text-lime-100/80">
              Запускайте ASO-материалы быстрее и экономьте время на рутине: генерация, редактирование, версии и экспорт
              в пару кликов.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-lime-700 dark:text-lime-300" />
                Для больших компаний
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700 dark:text-lime-100/80">
              Стандартизируйте ASO-процессы для нескольких приложений и рынков: единый workflow для команд продукта,
              маркетинга и growth-направления.
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button asChild size="lg" className="rounded-full px-7">
            <Link href="/login">
              Перейти к работе
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
