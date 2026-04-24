"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, X, Trash2, ChevronDown, ChevronUp, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageVar { name: string; description: string; }
interface AppPage { id: string; name: string; slug: string; description: string; variables: PageVar[]; }
interface Prompt { id: string; name: string; pageSlug: string; template: string; updatedAt: string; }

export default function PageDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  // Page state
  const [page, setPage] = useState<AppPage | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [vars, setVars] = useState<PageVar[]>([]);
  const [pageError, setPageError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Prompts state
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [showAddPrompt, setShowAddPrompt] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", template: "" });
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editForms, setEditForms] = useState<Record<string, { name: string; template: string }>>({});
  const [editSaving, setEditSaving] = useState<Record<string, boolean>>({});

  const addTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const loadPage = useCallback(async () => {
    const res = await fetch(`/api/admin/pages/${params.id}`);
    const data = await res.json();
    if (data.success) {
      setPage(data.data);
      setForm({ name: data.data.name, slug: data.data.slug, description: data.data.description ?? "" });
      setVars(data.data.variables ?? []);
    }
  }, [params.id]);

  const loadPrompts = useCallback(async () => {
    const res = await fetch("/api/admin/prompts");
    const data = await res.json();
    if (data.success) setPrompts(data.data);
  }, []);

  useEffect(() => { loadPage(); loadPrompts(); }, [loadPage, loadPrompts]);

  // ── Page handlers ──────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setPageError("");
    const cleanVars = vars.filter((v) => v.name.trim());
    const res = await fetch(`/api/admin/pages/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, variables: cleanVars }),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.success) { setPageError(data.error); return; }
    loadPage();
  }

  async function handleDelete() {
    if (!confirm("Delete this page? Associated prompts will also be removed.")) return;
    setDeleting(true);
    await fetch(`/api/admin/pages/${params.id}`, { method: "DELETE" });
    router.push("/admin/pages");
  }

  function updateVar(i: number, field: keyof PageVar, value: string) {
    setVars((prev) => prev.map((v, idx) => idx === i ? { ...v, [field]: value } : v));
  }

  // ── Prompt helpers ─────────────────────────────────────────────────────────

  function insertVar(
    varName: string,
    taRef: HTMLTextAreaElement | null,
    template: string,
    setTemplate: (t: string) => void,
  ) {
    if (!taRef) return;
    const start = taRef.selectionStart;
    const end = taRef.selectionEnd;
    const token = `{{${varName}}}`;
    setTemplate(template.slice(0, start) + token + template.slice(end));
    setTimeout(() => { taRef.focus(); taRef.setSelectionRange(start + token.length, start + token.length); }, 0);
  }

  // ── Prompt handlers ────────────────────────────────────────────────────────

  async function handleAddPrompt(e: React.FormEvent) {
    e.preventDefault();
    if (!page) return;
    setAddSaving(true); setAddError("");
    const res = await fetch("/api/admin/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addForm.name, pageSlug: page.slug, template: addForm.template }),
    });
    const data = await res.json();
    setAddSaving(false);
    if (!data.success) { setAddError(data.error); return; }
    setShowAddPrompt(false);
    setAddForm({ name: "", template: "" });
    loadPrompts();
  }

  async function handleSavePrompt(promptId: string) {
    if (!page) return;
    const ef = editForms[promptId];
    if (!ef) return;
    setEditSaving((prev) => ({ ...prev, [promptId]: true }));
    const res = await fetch(`/api/admin/prompts/${promptId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: ef.name, pageSlug: page.slug, template: ef.template }),
    });
    const data = await res.json();
    setEditSaving((prev) => ({ ...prev, [promptId]: false }));
    if (data.success) loadPrompts();
  }

  async function handleDeletePrompt(promptId: string) {
    if (!confirm("Delete this prompt? This cannot be undone.")) return;
    await fetch(`/api/admin/prompts/${promptId}`, { method: "DELETE" });
    setExpandedId(null);
    loadPrompts();
  }

  function togglePrompt(prompt: Prompt) {
    if (expandedId === prompt.id) {
      setExpandedId(null);
    } else {
      setExpandedId(prompt.id);
      setEditForms((prev) => ({ ...prev, [prompt.id]: { name: prompt.name, template: prompt.template } }));
    }
  }

  if (!page) return <div className="p-8 text-sm text-muted-foreground">Loading...</div>;

  const pagePrompts = prompts.filter((p) => p.pageSlug === page.slug);
  const cleanVars = vars.filter((v) => v.name.trim());

  return (
    <div className="p-8">
      <Link href="/admin/pages" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Pages & Prompts
      </Link>

      <h1 className="text-xl font-normal mb-1">{page.name}</h1>
      <p className="text-sm text-muted-foreground font-mono mb-8">/{page.slug}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* ── Left: Page details ─────────────────────────────────────────────── */}
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Page details</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this page does" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Variables</CardTitle>
                <Button type="button" variant="ghost" size="sm" onClick={() => setVars((v) => [...v, { name: "", description: "" }])} className="h-7 text-xs px-2">
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground mb-1">Referenced in prompts as {`{{variableName}}`}</p>
              {vars.length === 0 && <p className="text-xs text-muted-foreground">No variables yet.</p>}
              {vars.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={v.name} onChange={(e) => updateVar(i, "name", e.target.value)} placeholder="variableName" className="w-40" />
                  <Input value={v.description} onChange={(e) => updateVar(i, "description", e.target.value)} placeholder="Description (optional)" />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setVars((prev) => prev.filter((_, idx) => idx !== i))} className="h-7 w-7 p-0 shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {pageError && <p className="text-sm text-destructive">{pageError}</p>}

          <div className="flex items-center justify-between">
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
            <Button type="button" variant="ghost" onClick={handleDelete} disabled={deleting}
              className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4" /> Delete page
            </Button>
          </div>
        </form>

        {/* ── Right: Prompts ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-normal">Prompts</h2>
            {!showAddPrompt && (
              <Button size="sm" variant="outline" onClick={() => setShowAddPrompt(true)} className="h-7 text-xs px-2">
                <Plus className="w-3.5 h-3.5" /> Add prompt
              </Button>
            )}
          </div>

          {showAddPrompt && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">New prompt</CardTitle>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAddPrompt(false); setAddError(""); }} className="h-7 w-7 p-0">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddPrompt} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Name</Label>
                    <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Prompt name" required />
                  </div>
                  {cleanVars.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Click to insert variable at cursor</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cleanVars.map((v) => (
                          <button key={v.name} type="button"
                            onClick={() => insertVar(v.name, addTextareaRef.current, addForm.template, (t) => setAddForm((f) => ({ ...f, template: t })))}
                            className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-mono border border-border text-muted-foreground hover:border-primary hover:text-foreground transition-colors duration-200"
                            title={v.description}>
                            {`{{${v.name}}}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Label>Template</Label>
                    <Textarea
                      ref={addTextareaRef}
                      value={addForm.template}
                      onChange={(e) => setAddForm({ ...addForm, template: e.target.value })}
                      className="min-h-[140px] font-mono text-xs"
                      required
                    />
                  </div>
                  {addError && <p className="text-sm text-destructive">{addError}</p>}
                  <Button type="submit" size="sm" disabled={addSaving} className="self-start">
                    <Save className="w-3.5 h-3.5" />{addSaving ? "Saving..." : "Create prompt"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {pagePrompts.length === 0 && !showAddPrompt && (
            <p className="text-xs text-muted-foreground">No prompts for this page yet.</p>
          )}

          <div className="flex flex-col gap-2">
            {pagePrompts.map((prompt) => {
              const expanded = expandedId === prompt.id;
              const ef = editForms[prompt.id] ?? { name: prompt.name, template: prompt.template };
              const es = editSaving[prompt.id] ?? false;
              return (
                <Card key={prompt.id}>
                  <button
                    type="button"
                    onClick={() => togglePrompt(prompt)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="text-sm">{prompt.name}</span>
                    {expanded
                      ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  </button>

                  {expanded && (
                    <CardContent className="pt-0 border-t border-border">
                      <div className="pt-4 flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <Label>Name</Label>
                          <Input
                            value={ef.name}
                            onChange={(e) => setEditForms((prev) => ({ ...prev, [prompt.id]: { ...ef, name: e.target.value } }))}
                          />
                        </div>
                        {cleanVars.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Click to insert variable at cursor</p>
                            <div className="flex flex-wrap gap-1.5">
                              {cleanVars.map((v) => (
                                <button key={v.name} type="button"
                                  onClick={() => insertVar(
                                    v.name,
                                    editTextareaRefs.current[prompt.id],
                                    ef.template,
                                    (t) => setEditForms((prev) => ({ ...prev, [prompt.id]: { ...ef, template: t } })),
                                  )}
                                  className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-mono border border-border text-muted-foreground hover:border-primary hover:text-foreground transition-colors duration-200"
                                  title={v.description}>
                                  {`{{${v.name}}}`}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex flex-col gap-1.5">
                          <Label>Template</Label>
                          <Textarea
                            ref={(el) => { editTextareaRefs.current[prompt.id] = el; }}
                            value={ef.template}
                            onChange={(e) => setEditForms((prev) => ({ ...prev, [prompt.id]: { ...ef, template: e.target.value } }))}
                            className="min-h-[140px] font-mono text-xs"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Button size="sm" onClick={() => handleSavePrompt(prompt.id)} disabled={es}>
                            {es ? "Saving..." : "Save"}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleDeletePrompt(prompt.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
