import Link from "next/link";
import { LogOut } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-medium text-foreground hover:opacity-75 transition-opacity duration-200"
        >
          Loomis
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2 text-sm font-light text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
