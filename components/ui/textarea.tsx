import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "min-h-24 w-full rounded-xl border border-lime-200/90 bg-white/90 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-lime-200/40 backdrop-blur-sm placeholder:text-slate-500 transition focus-visible:border-lime-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-300/55 dark:border-lime-600/45 dark:bg-slate-950/70 dark:text-lime-100 dark:placeholder:text-lime-300/50 dark:shadow-none dark:focus-visible:border-lime-400 dark:focus-visible:ring-lime-500/25 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
