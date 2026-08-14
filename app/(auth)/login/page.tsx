"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const next = new URLSearchParams(window.location.search).get("next");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, next }),
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
    <div className="flex h-screen bg-white">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-blueprint px-14 py-12 text-white md:flex">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(120,160,200,0.35), transparent 55%), radial-gradient(ellipse 70% 50% at 85% 80%, rgba(40,70,110,0.55), transparent 50%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative">
          <div className="inline-flex items-center rounded-xl bg-white px-5 py-3">
            <Image src="/loomis-logo.png" alt="Loomis" height={36} width={154} className="object-contain" />
          </div>
        </div>

        <div className="relative max-w-md space-y-5">
          <p className="text-[13px] text-white/50">The Loomis Company</p>
          <h1 className="text-5xl leading-tight tracking-tight">
            Property &amp; Casualty
            <br />
            and Benefits,
            <br />
            in one place.
          </h1>
          <p className="max-w-sm text-[15px] leading-relaxed text-white/70">
            Tools for the people who place coverage, review claims, and take care of groups.
          </p>
        </div>

        <p className="relative text-[13px] text-white/40">Loomis Insurance Platform</p>
      </div>

      <main className="flex w-full flex-col items-center justify-center px-6 py-12 md:w-1/2">
        <Image
          src="/loomis-logo.png"
          alt="Loomis"
          height={36}
          width={154}
          className="mb-8 object-contain md:hidden"
        />

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-[420px] rounded-xl border border-line bg-white p-6"
        >
          <div className="flex flex-col gap-4">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              autoComplete="email"
              className="rounded-lg border border-line px-3 py-2 text-ink outline-none placeholder:text-placeholder"
            />

            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-line px-3 py-2 pr-10 text-ink outline-none placeholder:text-placeholder"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && <p className="text-[13px] text-accent">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg border border-line px-3 py-2 text-muted-foreground hover:text-ink disabled:opacity-40"
            >
              Continue
            </button>

            <p className="text-[13px] text-muted-foreground">Access is managed by your administrator.</p>
          </div>
        </form>

        <div className="mt-6 w-full max-w-[420px]">
          {[
            { label: "admin", email: "admin@admin.com", password: "password" },
            { label: "user", email: "user@example.com", password: "password" },
            { label: "benefits", email: "benefits@example.com", password: "password" },
          ].map((cred) => (
            <button
              key={cred.label}
              type="button"
              onClick={() => fillCredentials(cred.email, cred.password)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-muted-foreground hover:bg-soft hover:text-ink"
            >
              <span>{cred.label}</span>
              <span>{cred.email}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
