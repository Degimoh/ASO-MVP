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
    <main className="relative mx-auto flex min-h-screen w-full max-w-5xl items-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center text-lime-700/20 opacity-35 dark:text-lime-300/20 dark:opacity-30"
      >
        <svg
          viewBox="0 0 1200 620"
          className="h-[92%] w-[110%] max-w-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g stroke="currentColor" strokeWidth="1.35">
            <path d="M112 205c26-21 65-36 113-29 29 4 53 20 74 32 19 11 40 18 67 17 36-1 64-22 98-35 42-16 98-24 149-8 36 12 63 40 94 53 30 13 67 9 102 0 46-12 94-34 142-24 43 9 73 38 108 60" />
            <path d="M92 270c30-14 63-10 92 4 18 8 34 22 55 26 37 7 73-18 111-24 52-9 104 16 149 42 32 18 65 35 103 35 34 0 65-14 97-27 45-18 92-31 141-26 49 5 92 30 132 57" />
            <path d="M132 350c32 6 60 27 88 43 40 22 82 34 129 32 42-2 81-16 122-19 53-5 102 8 149 31 34 17 67 38 105 44 43 8 86-4 126-20" />
            <path d="M245 160c-16 26-8 54 12 73 20 19 50 29 70 49 19 20 23 50 17 77" />
            <path d="M505 146c-17 21-23 48-11 74 15 34 57 49 74 82 14 27 5 55-5 81" />
            <path d="M760 154c-13 18-20 42-8 64 14 27 48 39 63 66 18 33 4 70-12 101" />
            <path d="M978 188c-18 23-10 53 9 73 19 19 50 29 58 56 8 26-8 51-23 72" />
            <path d="M380 468c19 16 47 23 73 16 22-5 40-19 62-24 27-6 54 2 77 17" />
            <path d="M782 452c22 14 53 18 77 7 21-9 35-28 56-36 26-10 55-4 81 8" />
          </g>
        </svg>
      </div>

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
