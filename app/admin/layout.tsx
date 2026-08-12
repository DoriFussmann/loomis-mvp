"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, FileText, LayoutDashboard, LogOut, Table2 } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/pages", label: "Pages & Prompts", icon: FileText },
  { href: "/admin/gap-rates", label: "GAP Rates", icon: Table2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-foreground hover:opacity-75 transition-opacity duration-200"
            >
              Loomis
            </Link>
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
              Admin
            </span>
            <nav className="flex items-center gap-1">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-light transition-colors duration-200 ${
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
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
      <main className="max-w-[1280px] mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
