"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageVar { name: string; description: string; }
interface AppPage { id: string; name: string; slug: string; description: string; variables: PageVar[]; }

export default function PagesAdminPage() {
  const [pages, setPages] = useState<AppPage[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [vars, setVars] = useState<PageVar[]>([{ name: "", description: "" }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/pages");
    const data = await res.json();
    if (data.success) setPages(data.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const cleanVars = vars.filter((v) => v.name.trim());
    const res = await fetch("/api/admin/pages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, variables: cleanVars }) });
    const data = await res.json();
    setSaving(false);
    if (!data.success) { setError(data.error); return; }
    setShowAdd(false); setForm({ name: "", slug: "", description: "" }); setVars([{ name: "", description: "" }]); load();
  }

  function updateVar(i: number, field: keyof PageVar, value: string) {
    setVars((prev) => prev.map((v, idx) => idx === i ? { ...v, [field]: value } : v));
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-normal">Pages & Prompts</h1>
          <p className="text-sm text-muted-foreground mt-1">Define pages, their variables, and associated prompts</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} size="sm">
          <Plus className="w-4 h-4" /> Add page
        </Button>
      </div>

      {showAdd && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm">New page</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Test Page" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Slug</Label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="test-page" required />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this page does" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Variables</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setVars((v) => [...v, { name: "", description: "" }])} className="h-6 text-xs px-2">
                    <Plus className="w-3 h-3" /> Add variable
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-2">Variables are referenced in prompts as {`{{variableName}}`}</p>
                <div className="flex flex-col gap-2">
                  {vars.map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={v.name} onChange={(e) => updateVar(i, "name", e.target.value)} placeholder="variableName" className="w-40" />
                      <Input value={v.description} onChange={(e) => updateVar(i, "description", e.target.value)} placeholder="Description (optional)" />
                      <Button type="button" variant="ghost" size="sm" onClick={() => setVars((prev) => prev.filter((_, idx) => idx !== i))} className="h-7 w-7 p-0 shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving..." : "Create page"}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAdd(false); setError(""); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {pages.map((page) => (
          <Link key={page.id} href={`/admin/pages/${page.id}`}>
            <Card className="hover:bg-accent/40 transition-colors duration-200 cursor-pointer h-full">
              <CardContent className="p-4">
                <p className="text-sm font-normal">{page.name}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
