"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/pages", label: "Pages & Prompts" },
  { href: "/admin/gap-rates", label: "GAP Rates" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col bg-white">
      <header className="flex h-12 items-center justify-between border-b border-line bg-white pr-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex h-12 items-center px-4 hover:bg-soft">
            <Image src="/loomis-logo.png" alt="Loomis" height={22} width={94} className="object-contain" />
          </Link>
          <nav className="flex items-center gap-3">
            {navItems.map(({ href, label }) => {
              const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-lg border border-line px-3 py-1.5 ${
                    active
                      ? "bg-soft text-ink"
                      : "text-muted-foreground hover:bg-soft hover:text-ink"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="text-muted-foreground hover:text-ink">
            Sign out
          </button>
        </form>
      </header>
      <main className="flex min-h-0 flex-1 flex-col px-8 py-6">{children}</main>
    </div>
  );
}
