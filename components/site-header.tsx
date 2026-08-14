import Link from "next/link";
import Image from "next/image";

export function SiteHeader() {
  return (
    <header className="h-12 border-b border-line bg-white pr-4">
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between">
        <Link href="/" className="flex h-full items-center px-4 hover:bg-soft">
          <Image src="/loomis-logo.png" alt="Loomis" height={22} width={94} className="object-contain" />
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="text-muted-foreground hover:text-ink"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
