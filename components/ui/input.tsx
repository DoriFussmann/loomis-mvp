import { InputHTMLAttributes, forwardRef } from "react";
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input ref={ref} className={`flex w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none placeholder:text-placeholder disabled:cursor-not-allowed disabled:opacity-40 ${className}`} {...props} />
  )
);
Input.displayName = "Input";
