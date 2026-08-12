"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.success) {
      setError(data.error ?? "login failed");
      return;
    }
    router.push(data.data.destination ?? "/");
    router.refresh();
  }

  function fillCredentials(e: string, p: string) {
    setEmail(e);
    setPassword(p);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-primary text-primary-foreground px-12 py-12 xl:px-16 xl:py-14">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_15%,hsl(var(--primary-foreground)/0.12),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_90%_90%,hsl(var(--primary-foreground)/0.06),transparent_45%)]" />
          <div className="absolute -right-24 -top-28 h-[34rem] w-[34rem] rounded-full border border-primary-foreground/10" />
          <div className="absolute -right-8 -top-12 h-[24rem] w-[24rem] rounded-full border border-primary-foreground/10" />
          <div className="absolute -bottom-36 -left-24 h-[32rem] w-[32rem] rounded-full bg-primary-foreground/[0.05]" />
          <div
            className="absolute inset-0 opacity-[0.09] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="relative">
          <div className="inline-flex items-center rounded-md bg-background px-5 py-3 shadow-sm">
            <Image src="/loomis-logo.png" alt="Loomis" height={36} width={154} className="object-contain" />
          </div>
        </div>

        <div className="relative max-w-md space-y-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-primary-foreground/50">
            The Loomis Company
          </p>
          <h1 className="text-4xl xl:text-5xl font-light tracking-tight leading-[1.15]">
            Property &amp; Casualty
            <br />
            and Benefits,
            <br />
            in one place.
          </h1>
          <p className="max-w-sm text-sm font-light leading-relaxed text-primary-foreground/60">
            Tools for the people who place coverage, review claims, and take care of groups.
          </p>
        </div>

        <p className="relative text-[10px] font-medium uppercase tracking-[0.22em] text-primary-foreground/40">
          Loomis Insurance Platform
        </p>
      </aside>

      <main className="flex flex-col items-center justify-center px-6 py-12 gap-8">
        <Image
          src="/loomis-logo.png"
          alt="Loomis"
          height={36}
          width={154}
          className="object-contain lg:hidden"
        />

        <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[10px] font-medium uppercase tracking-widest text-foreground/40">
              email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="text-xs font-light bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-foreground/40 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[10px] font-medium uppercase tracking-widest text-foreground/40">
              password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="text-xs font-light bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-foreground/40 transition-colors"
            />
          </div>

          {error && <p className="text-xs text-destructive font-light">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 px-4 py-1.5 text-sm font-light rounded-md border border-foreground/30 text-foreground bg-transparent hover:bg-foreground/5 transition-colors disabled:opacity-40"
          >
            {loading ? "signing in..." : "sign in"}
          </button>
        </form>

        <div className="w-full max-w-xs rounded-md border border-dashed border-border bg-muted/30 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-widest text-foreground/40 mb-2">demo credentials</p>
          <div className="flex flex-col gap-1">
            {[
              { label: "admin", email: "admin@admin.com", password: "password" },
              { label: "user", email: "user@example.com", password: "password" },
              { label: "benefits user", email: "benefits@example.com", password: "password" },
            ].map((cred) => (
              <button
                key={cred.label}
                type="button"
                onClick={() => fillCredentials(cred.email, cred.password)}
                className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted transition-colors text-left"
              >
                <span className="text-xs font-light text-foreground">{cred.label}</span>
                <span className="text-[10px] font-light text-muted-foreground/70 font-mono">{cred.email}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
