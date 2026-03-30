import { ReactNode } from "react";

type PageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-8">
      <header className="space-y-2 rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-6">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
        <p className="max-w-2xl text-sm text-slate-600">{description}</p>
      </header>
      {children}
    </section>
  );
}
