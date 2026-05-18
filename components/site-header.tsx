import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b border-border/30 bg-background">
      <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="hover:opacity-75 transition-opacity duration-200">
          <Image src="/loomis-logo.png" alt="Loomis" height={22} width={94} className="object-contain" />
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2 text-sm font-light text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            sign out
          </button>
        </form>
      </div>
    </header>
  );
}
