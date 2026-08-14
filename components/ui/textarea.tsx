import { TextareaHTMLAttributes, forwardRef } from "react";
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea ref={ref} className={`flex min-h-[80px] w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none placeholder:text-placeholder disabled:cursor-not-allowed disabled:opacity-40 ${className}`} {...props} />
  )
);
Textarea.displayName = "Textarea";
