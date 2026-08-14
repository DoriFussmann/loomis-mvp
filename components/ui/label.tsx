import { LabelHTMLAttributes, forwardRef } from "react";
export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className = "", ...props }, ref) => (
    <label ref={ref} className={`text-[13px] leading-none text-ink ${className}`} {...props} />
  )
);
Label.displayName = "Label";
