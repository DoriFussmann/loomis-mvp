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
type Department = "P&C" | "Benefits";
const DEPARTMENTS: Department[] = ["P&C", "Benefits"];
interface User { id: string; name: string; email: string; role: string; allowedPages: string[]; departments: Department[]; }

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [form, setForm] = useState({ name: "", email: "", role: "user" });
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
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
      setDepartments(u.data.departments ?? []);
    }
    if (p.success) setPages(p.data);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const body: Record<string, unknown> = { ...form, allowedPages, departments };
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

  function toggleDepartment(department: Department) {
    setDepartments((prev) =>
      prev.includes(department) ? prev.filter((d) => d !== department) : [...prev, department]
    );
  }

  if (!user) return <div className="text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-xl">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Users
      </Link>

      <h1 className="mb-1 text-[15px] text-ink">{user.name}</h1>
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
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>New password <span className="text-muted-foreground font-light">(leave blank to keep current)</span></Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Departments</Label>
              <div className="flex flex-wrap gap-2">
                {DEPARTMENTS.map((department) => {
                  const selected = departments.includes(department);
                  return (
                    <button
                      key={department}
                      type="button"
                      onClick={() => toggleDepartment(department)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 ${
                        selected
                          ? "border-line bg-soft text-ink"
                          : "border-line text-muted-foreground hover:bg-soft hover:text-ink"
                      }`}
                    >
                      {department}
                    </button>
                  );
                })}
              </div>
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
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 ${has ? "border-line bg-soft text-ink" : "border-line text-muted-foreground hover:bg-soft hover:text-ink"}`}>
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
