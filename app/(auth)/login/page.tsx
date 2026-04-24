"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
      setError(data.error ?? "Login failed");
      return;
    }
    router.push(data.data.role === "admin" ? "/admin" : "/");
    router.refresh();
  }

  function fillCredentials(email: string, password: string) {
    setEmail(email);
    setPassword(password);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 gap-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Sign in</CardTitle>
          <CardDescription>Enter your credentials to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="mt-1">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="w-full max-w-sm rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <p className="mb-2 font-medium text-xs uppercase tracking-wide text-muted-foreground/60">Demo credentials</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fillCredentials("admin@admin.com", "password")}
            className="flex flex-col rounded px-2 py-1.5 hover:bg-muted transition-colors text-left"
          >
            <span className="font-medium">Admin</span>
            <span className="font-mono text-xs text-muted-foreground/70">admin@admin.com</span>
            <span className="font-mono text-xs text-muted-foreground/70">password</span>
          </button>
          <button
            type="button"
            onClick={() => fillCredentials("user@example.com", "password")}
            className="flex flex-col rounded px-2 py-1.5 hover:bg-muted transition-colors text-left"
          >
            <span className="font-medium">User</span>
            <span className="font-mono text-xs text-muted-foreground/70">user@example.com</span>
            <span className="font-mono text-xs text-muted-foreground/70">password</span>
          </button>
        </div>
      </div>
    </div>
  );
}
