import { HTMLAttributes } from "react";
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> { variant?: "default" | "secondary" | "outline"; }
export function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  const variants = { default: "bg-primary text-primary-foreground", secondary: "bg-secondary text-secondary-foreground", outline: "border border-border text-foreground" };
  return <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-light ${variants[variant]} ${className}`} {...props} />;
}
