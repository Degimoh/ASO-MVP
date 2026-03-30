import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-lime-200/80 bg-white/95 px-3.5 py-2 text-sm text-slate-900 shadow-sm shadow-lime-100/50 placeholder:text-slate-400/90 transition focus-visible:border-lime-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lime-200/70 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
