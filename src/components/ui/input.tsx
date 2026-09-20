import * as React from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full bg-surface border border-border rounded-md px-3 text-sm text-foreground placeholder:text-muted-foreground/70 " +
  "transition-colors focus:border-brand-400 disabled:opacity-60 disabled:cursor-not-allowed " +
  "user-invalid:border-danger user-invalid:bg-danger-surface/40";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input ref={ref} className={cn(fieldBase, "h-10", className)} {...props} />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(fieldBase, "py-2 min-h-24 resize-y", className)}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(fieldBase, "h-10 pr-8 appearance-none bg-no-repeat", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235a6672' stroke-width='2.5' stroke-linecap='round'><path d='m6 9 6 6 6-6'/></svg>\")",
        backgroundPosition: "right 0.6rem center",
        ...props.style,
      }}
      {...props}
    />
  );
});
