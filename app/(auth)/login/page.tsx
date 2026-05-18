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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 gap-8">
      {/* Logo */}
      <Image src="/loomis-logo.png" alt="Loomis" height={36} width={154} className="object-contain" />

      {/* Form */}
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

      {/* Demo credentials */}
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
    </div>
  );
}
