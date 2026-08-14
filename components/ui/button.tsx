import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white text-muted-foreground outline-none transition-colors duration-200 hover:text-ink disabled:pointer-events-none disabled:opacity-40";
    const variants = {
      default: "",
      secondary: "bg-soft text-ink hover:bg-white",
      ghost: "border-transparent bg-transparent hover:bg-soft hover:text-ink",
      destructive: "text-accent hover:text-ink",
      outline: "",
    };
    const sizes = { sm: "px-3 py-1.5", md: "px-3 py-2", lg: "px-3 py-2" };
    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
