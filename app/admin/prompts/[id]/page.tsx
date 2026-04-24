"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageVar { name: string; description: string; }
interface AppPage { id: string; name: string; slug: string; variables: PageVar[]; }
interface Prompt { id: string; name: string; pageSlug: string; template: string; updatedAt: string; }

export default function PromptDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [pages, setPages] = useState<AppPage[]>([]);
  const [form, setForm] = useState({ name: "", pageSlug: "", template: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    const [pRes, pgRes] = await Promise.all([
      fetch(`/api/admin/prompts/${params.id}`),
      fetch("/api/admin/pages"),
    ]);
    const [p, pg] = await Promise.all([pRes.json(), pgRes.json()]);
    if (p.success) {
      setPrompt(p.data);
      setForm({ name: p.data.name, pageSlug: p.data.pageSlug, template: p.data.template });
    }
    if (pg.success) setPages(pg.data);
  }, [params.id]);

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
    const res = await fetch(`/api/admin/prompts/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.success) { setError(data.error); return; }
    load();
  }

  async function handleDelete() {
    if (!confirm("Delete this prompt? This cannot be undone.")) return;
    setDeleting(true);
    await fetch(`/api/admin/prompts/${params.id}`, { method: "DELETE" });
    router.push("/admin/prompts");
  }

  const selectedPageVars = getPageVars(form.pageSlug);

  if (!prompt) return <div className="p-8 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="p-8 max-w-xl">
      <Link href="/admin/prompts" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Prompts
      </Link>

      <h1 className="text-xl font-normal mb-1">{prompt.name}</h1>
      <p className="text-sm text-muted-foreground mb-8">Updated {new Date(prompt.updatedAt).toLocaleDateString()}</p>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Prompt details</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Page</Label>
              <select value={form.pageSlug} onChange={(e) => setForm({ ...form, pageSlug: e.target.value })} required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">Select a page...</option>
                {pages.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Template</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {selectedPageVars.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Click to insert variable at cursor</p>
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
            <Textarea
              ref={textareaRef}
              value={form.template}
              onChange={(e) => setForm({ ...form, template: e.target.value })}
              className="min-h-[200px] font-mono text-xs"
              required
            />
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
          <Button type="button" variant="ghost" onClick={handleDelete} disabled={deleting}
            className="text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4" /> Delete prompt
          </Button>
        </div>
      </form>
    </div>
  );
}
