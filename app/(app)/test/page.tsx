"use client";
import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Prompt { id: string; name: string; }

export default function TestPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [promptId, setPromptId] = useState("");
  const [chars, setChars] = useState({ character1: "", character2: "", character3: "" });
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/prompts")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const testPrompts = data.data.filter((p: { pageSlug: string }) => p.pageSlug === "test");
          setPrompts(testPrompts);
          if (testPrompts.length > 0) setPromptId(testPrompts[0].id);
        }
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!promptId) { setError("No prompt configured for this page. Ask your admin."); return; }
    setLoading(true); setError(""); setResult("");
    const res = await fetch("/api/run-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promptId, variables: chars }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.success) { setError(data.error ?? "Something went wrong"); return; }
    setResult(data.data.result);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-normal">Story Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">Enter three characters and we'll write a story.</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Characters</CardTitle>
          <CardDescription>One character per field</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {(["character1", "character2", "character3"] as const).map((key, i) => (
              <div key={key} className="flex flex-col gap-1.5">
                <Label htmlFor={key}>Character {i + 1}</Label>
                <Input
                  id={key}
                  value={chars[key]}
                  onChange={(e) => setChars({ ...chars, [key]: e.target.value })}
                  placeholder={`e.g. ${["Alice", "the old wizard", "a talking fox"][i]}`}
                  required
                />
              </div>
            ))}

            {prompts.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <Label>Prompt</Label>
                <select value={promptId} onChange={(e) => setPromptId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {prompts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? "Generating..." : "Generate story"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Your story</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{result}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
