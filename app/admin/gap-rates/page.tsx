"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GapQuoteBucketKey, GapQuoteCatalog, GapQuoteRateRow } from "@/lib/gapQuote/schema";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function money(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const EMPTY_FORM = {
  bucketKey: "standard" as GapQuoteBucketKey,
  deductible: "",
  benefit: "",
  rateEeOnly: "",
  rateEeSpouse: "",
  rateEeChildren: "",
  rateFamily: "",
};

export default function GapRatesAdminPage() {
  const [catalog, setCatalog] = useState<GapQuoteCatalog | null>(null);
  const [adminFee, setAdminFee] = useState("0");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [savingFee, setSavingFee] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [savingRow, setSavingRow] = useState(false);
  const [filterBucket, setFilterBucket] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/gap-rates");
    const data = await res.json();
    if (data.success) {
      setCatalog(data.data);
      setAdminFee(String(data.data.settings.adminFee));
    } else {
      setError(data.error ?? "Failed to load rates");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveFee(e: React.FormEvent) {
    e.preventDefault();
    setSavingFee(true);
    setError("");
    const res = await fetch("/api/admin/gap-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminFee: Number(adminFee) }),
    });
    const data = await res.json();
    setSavingFee(false);
    if (!data.success) {
      setError(data.error);
      return;
    }
    setStatus("Admin fee saved");
    load();
  }

  async function onImport(file: File | null) {
    if (!file) return;
    setImporting(true);
    setError("");
    setStatus("");
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await fetch("/api/admin/gap-rates/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64, mediaType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error);
        return;
      }
      setStatus(`Imported ${data.data.importedRates} rate rows`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSavingRow(true);
    setError("");
    const res = await fetch("/api/admin/gap-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bucketKey: form.bucketKey,
        deductible: Number(form.deductible),
        benefit: Number(form.benefit),
        rateEeOnly: Number(form.rateEeOnly),
        rateEeSpouse: Number(form.rateEeSpouse),
        rateEeChildren: Number(form.rateEeChildren),
        rateFamily: Number(form.rateFamily),
      }),
    });
    const data = await res.json();
    setSavingRow(false);
    if (!data.success) {
      setError(data.error);
      return;
    }
    setShowAdd(false);
    setForm(EMPTY_FORM);
    load();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/gap-rates/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) {
      setError(data.error);
      return;
    }
    load();
  }

  const rates: GapQuoteRateRow[] = (catalog?.rates ?? []).filter(
    (row) => filterBucket === "all" || row.bucketKey === filterBucket
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-normal">GAP Rates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Import the Loomis U100 rate card and edit plan designs, buckets, and the admin fee
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => onImport(e.target.files?.[0] ?? null)}
          />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={importing}>
            <Upload className="w-4 h-4" />
            {importing ? "Importing..." : "Import rate card"}
          </Button>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="w-4 h-4" /> Add row
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}
      {status && <p className="text-sm text-muted-foreground mb-4">{status}</p>}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Admin fee</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveFee} className="flex items-end gap-3">
            <div className="flex flex-col gap-1.5 w-40">
              <Label>Flat monthly admin fee</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={adminFee}
                onChange={(e) => setAdminFee(e.target.value)}
              />
            </div>
            <Button type="submit" size="sm" disabled={savingFee}>
              {savingFee ? "Saving..." : "Save fee"}
            </Button>
            <p className="text-xs text-muted-foreground pb-2">
              Shown as its own line on quotes. Rate-card premiums already include TPA load; leave 0 unless adding a flat dollar amount.
            </p>
          </form>
        </CardContent>
      </Card>

      {catalog && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {catalog.buckets.map((bucket) => (
            <Card key={bucket.bucketKey}>
              <CardContent className="p-4">
                <p className="text-sm font-normal">{bucket.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{bucket.states.join(", ")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Lives {bucket.livesMin}–{bucket.livesMax}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showAdd && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">New rate row</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Bucket</Label>
                <select
                  value={form.bucketKey}
                  onChange={(e) => setForm({ ...form, bucketKey: e.target.value as GapQuoteBucketKey })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {(catalog?.buckets ?? []).map((bucket) => (
                    <option key={bucket.bucketKey} value={bucket.bucketKey}>
                      {bucket.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Deductible</Label>
                <Input value={form.deductible} onChange={(e) => setForm({ ...form, deductible: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Limit / benefit</Label>
                <Input value={form.benefit} onChange={(e) => setForm({ ...form, benefit: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>EE</Label>
                <Input value={form.rateEeOnly} onChange={(e) => setForm({ ...form, rateEeOnly: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>EE + SP</Label>
                <Input value={form.rateEeSpouse} onChange={(e) => setForm({ ...form, rateEeSpouse: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>EE + CH</Label>
                <Input value={form.rateEeChildren} onChange={(e) => setForm({ ...form, rateEeChildren: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Family</Label>
                <Input value={form.rateFamily} onChange={(e) => setForm({ ...form, rateFamily: e.target.value })} required />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" size="sm" disabled={savingRow}>
                  {savingRow ? "Saving..." : "Create"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">{rates.length} rate row{rates.length === 1 ? "" : "s"}</p>
        <select
          value={filterBucket}
          onChange={(e) => setFilterBucket(e.target.value)}
          className="flex h-8 rounded-md border border-input bg-transparent px-2 text-xs font-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="all">All buckets</option>
          {(catalog?.buckets ?? []).map((bucket) => (
            <option key={bucket.bucketKey} value={bucket.bucketKey}>
              {bucket.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-normal">Bucket</th>
              <th className="px-3 py-2 font-normal">Deductible</th>
              <th className="px-3 py-2 font-normal">Limit</th>
              <th className="px-3 py-2 font-normal">EE</th>
              <th className="px-3 py-2 font-normal">EE + SP</th>
              <th className="px-3 py-2 font-normal">EE + CH</th>
              <th className="px-3 py-2 font-normal">Family</th>
              <th className="px-3 py-2 font-normal" />
            </tr>
          </thead>
          <tbody>
            {rates.map((row) => {
              const bucketLabel = catalog?.buckets.find((bucket) => bucket.bucketKey === row.bucketKey)?.label ?? row.bucketKey;
              return (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2 text-xs">{bucketLabel}</td>
                  <td className="px-3 py-2">{money(row.deductible)}</td>
                  <td className="px-3 py-2">{money(row.benefit)}</td>
                  <td className="px-3 py-2">{money(row.rateEeOnly)}</td>
                  <td className="px-3 py-2">{money(row.rateEeSpouse)}</td>
                  <td className="px-3 py-2">{money(row.rateEeChildren)}</td>
                  <td className="px-3 py-2">{money(row.rateFamily)}</td>
                  <td className="px-3 py-2 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              );
            })}
            {rates.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No rates yet. Import the Loomis U100 rate card to populate this table.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
