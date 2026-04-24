"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Plus, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PageVar { name: string; description: string; }
interface AppPage { id: string; name: string; slug: string; variables: PageVar[]; }
interface Prompt { id: string; name: string; pageSlug: string; template: string; updatedAt: string; }

export default function PromptsAdminPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [pages, setPages] = useState<AppPage[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", pageSlug: "", template: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    const [pRes, pgRes] = await Promise.all([fetch("/api/admin/prompts"), fetch("/api/admin/pages")]);
    const [p, pg] = await Promise.all([pRes.json(), pgRes.json()]);
    if (p.success) setPrompts(p.data);
    if (pg.success) setPages(pg.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  function insertVariable(varName: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const token = `{{${varName}}}`;
    const newTemplate = form.template.slice(0, start) + token + form.template.slice(end);
    setForm((f) => ({ ...f, template: newTemplate }));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + token.length, start + token.length); }, 0);
  }

  function getPageVars(slug: string): PageVar[] {
    return pages.find((p) => p.slug === slug)?.variables ?? [];
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch("/api/admin/prompts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setSaving(false);
    if (!data.success) { setError(data.error); return; }
    setShowAdd(false); setForm({ name: "", pageSlug: "", template: "" }); load();
  }

  const selectedPageVars = getPageVars(form.pageSlug);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-normal">Prompts</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage AI prompts. Use {`{{variableName}}`} to insert page variables.</p>
        </div>
        {!showAdd && (
          <Button onClick={() => setShowAdd(true)} size="sm">
            <Plus className="w-4 h-4" /> Add prompt
          </Button>
        )}
      </div>

      {showAdd && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">New prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Prompt name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Character Story" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Page</Label>
                  <select value={form.pageSlug} onChange={(e) => setForm({ ...form, pageSlug: e.target.value })} required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="">Select a page...</option>
                    {pages.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {selectedPageVars.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Available variables — click to insert at cursor</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPageVars.map((v) => (
                      <button key={v.name} type="button" onClick={() => insertVariable(v.name)}
                        className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-mono border border-border text-muted-foreground hover:border-primary hover:text-foreground transition-colors duration-200"
                        title={v.description}>
                        {`{{${v.name}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label>Prompt template</Label>
                <Textarea
                  ref={textareaRef}
                  value={form.template}
                  onChange={(e) => setForm({ ...form, template: e.target.value })}
                  placeholder="Write a short story featuring {{character1}}, {{character2}}, and {{character3}}..."
                  className="min-h-[140px] font-mono text-xs"
                  required
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  <Save className="w-4 h-4" />{saving ? "Saving..." : "Create prompt"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAdd(false); setError(""); }}>
                  <X className="w-4 h-4" /> Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {prompts.map((prompt) => {
          const pageName = pages.find((p) => p.slug === prompt.pageSlug)?.name ?? prompt.pageSlug;
          return (
            <Link key={prompt.id} href={`/admin/prompts/${prompt.id}`}>
              <Card className="hover:bg-accent/40 transition-colors duration-200 cursor-pointer h-full">
                <CardContent className="p-4">
                  <p className="text-sm font-normal mb-1.5">{prompt.name}</p>
                  <Badge variant="secondary" className="text-xs mb-2">{pageName}</Badge>
                  <p className="text-xs text-muted-foreground font-mono leading-relaxed line-clamp-3 whitespace-pre-wrap">{prompt.template}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
