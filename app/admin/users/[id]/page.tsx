"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Page { id: string; name: string; slug: string; }
interface User { id: string; name: string; email: string; role: string; allowedPages: string[]; }

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [form, setForm] = useState({ name: "", email: "", role: "user" });
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const [uRes, pRes] = await Promise.all([
      fetch(`/api/admin/users/${params.id}`),
      fetch("/api/admin/pages"),
    ]);
    const [u, p] = await Promise.all([uRes.json(), pRes.json()]);
    if (u.success) {
      setUser(u.data);
      setForm({ name: u.data.name, email: u.data.email, role: u.data.role });
      setAllowedPages(u.data.allowedPages ?? []);
    }
    if (p.success) setPages(p.data);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const body: Record<string, unknown> = { ...form, allowedPages };
    if (newPassword.trim()) body.password = newPassword;
    const res = await fetch(`/api/admin/users/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.success) { setError(data.error); return; }
    setNewPassword("");
    load();
  }

  async function handleDelete() {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    setDeleting(true);
    await fetch(`/api/admin/users/${params.id}`, { method: "DELETE" });
    router.push("/admin/users");
  }

  function togglePage(slug: string) {
    setAllowedPages((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  if (!user) return <div className="p-8 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="p-8 max-w-xl">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Users
      </Link>

      <h1 className="text-xl font-normal mb-1">{user.name}</h1>
      <p className="text-sm text-muted-foreground mb-8">{user.email}</p>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Account details</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Role</Label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>New password <span className="text-muted-foreground font-light">(leave blank to keep current)</span></Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </CardContent>
        </Card>

        {form.role === "user" && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Page access</CardTitle></CardHeader>
            <CardContent>
              {pages.length === 0 ? (
                <p className="text-xs text-muted-foreground">No pages defined yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {pages.map((page) => {
                    const has = allowedPages.includes(page.slug);
                    return (
                      <button key={page.slug} type="button" onClick={() => togglePage(page.slug)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-light border transition-colors duration-200 ${has ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                        {has && <Check className="w-3.5 h-3.5" />}{page.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
          <Button type="button" variant="ghost" onClick={handleDelete} disabled={deleting}
            className="text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4" /> Delete user
          </Button>
        </div>
      </form>
    </div>
  );
}
