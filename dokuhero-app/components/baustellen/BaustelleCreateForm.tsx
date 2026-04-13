"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";

export function BaustelleCreateForm({
  onCreated,
  title = "Neue Baustelle",
}: {
  onCreated: (id: number) => void;
  title?: string;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [customer, setCustomer] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/baustellen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || null,
          customer_name: customer.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        setErr("Speichern fehlgeschlagen.");
        return;
      }
      const j = (await res.json().catch(() => ({}))) as { id?: number | bigint };
      const nid = typeof j.id === "bigint" ? Number(j.id) : Number(j.id);
      if (!Number.isFinite(nid) || nid <= 0) {
        setErr("Speichern fehlgeschlagen.");
        return;
      }
      setName("");
      setAddress("");
      setCustomer("");
      setNotes("");
      onCreated(nid);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className="text-sm font-medium text-slate-700">Name *</label>
          <Input required className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Adresse</label>
          <Textarea rows={2} className="mt-1" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Kunde / Ansprechort</label>
          <Input className="mt-1" value={customer} onChange={(e) => setCustomer(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Notizen</label>
          <Textarea rows={2} className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <Button type="submit" disabled={busy} variant="primary">
          {busy ? "Wird angelegt …" : "Anlegen"}
        </Button>
      </form>
    </Card>
  );
}
