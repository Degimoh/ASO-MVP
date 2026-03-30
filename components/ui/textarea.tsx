import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "min-h-24 w-full rounded-xl border border-lime-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm shadow-lime-100/50 backdrop-blur-sm placeholder:text-slate-400 transition focus-visible:border-lime-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-200/65 disabled:cursor-not-allowed disabled:opacity-50",
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
