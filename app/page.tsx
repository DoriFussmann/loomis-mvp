import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getPages } from "@/lib/data";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await getSession();
  const allPages = getPages();

  const accessiblePages = session
    ? session.role === "admin"
      ? allPages
      : allPages.filter((p) => session.allowedPages.includes(p.slug))
    : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-[1080px] mx-auto w-full px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-normal text-foreground">App</span>
          <div className="flex items-center gap-3">
            {session ? (
              <>
                {session.role === "admin" && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm">Admin</Button>
                  </Link>
                )}
                <form action="/api/auth/logout" method="POST">
                  <Button variant="ghost" size="sm" type="submit">Sign out</Button>
                </form>
              </>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">Sign in</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 max-w-[1080px] mx-auto w-full">
        {session ? (
          accessiblePages.length > 0 ? (
            <div className="grid grid-cols-5 gap-2">
              {accessiblePages.map((page) => (
                <Link key={page.id} href={`/${page.slug}`}>
                  <button className="w-full px-4 py-2.5 rounded-md text-sm bg-muted text-foreground hover:bg-muted/70 transition-colors duration-200 truncate">
                    {page.name}
                  </button>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No pages have been assigned to your account yet.</p>
          )
        ) : (
          <Link href="/login">
            <Button size="lg">Sign in to continue</Button>
          </Link>
        )}
      </main>
    </div>
  );
}
