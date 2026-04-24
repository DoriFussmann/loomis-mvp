import { LabelHTMLAttributes, forwardRef } from "react";
export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className = "", ...props }, ref) => (
    <label ref={ref} className={`text-sm font-light leading-none text-foreground ${className}`} {...props} />
  )
);
Label.displayName = "Label";
