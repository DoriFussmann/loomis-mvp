import { HTMLAttributes } from "react";
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> { variant?: "default" | "secondary" | "outline"; }
export function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-line bg-soft text-ink",
    secondary: "border-line bg-white text-muted-foreground",
    outline: "border-line bg-white text-ink",
  };
  return <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[13px] ${variants[variant]} ${className}`} {...props} />;
}
