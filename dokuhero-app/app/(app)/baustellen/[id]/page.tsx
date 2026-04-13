"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

type B = {
  id: number;
  name: string;
  address: string | null;
  customer_name: string | null;
  notes: string | null;
};

type Br = { id: number; title: string; status: string; report_date: string };

export default function BaustelleDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [b, setB] = useState<B | null>(null);
  const [list, setList] = useState<Br[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [customer, setCustomer] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [load, setLoad] = useState(true);
  const [saveBusy, setSaveBusy] = useState(false);

  const fetchData = useCallback(async () => {
    setErr(null);
    const [r1, r2] = await Promise.all([
      fetch(`/api/baustellen/${id}`),
      fetch(`/api/baustellen/${id}/berichte`),
    ]);
    if (!r1.ok) {
      setB(null);
      setList([]);
      if (r1.status === 404) setErr("Baustelle nicht gefunden.");
      else setErr("Laden fehlgeschlagen.");
      return;
    }
    if (!r2.ok) {
      setB(null);
      setList([]);
      setErr("Berichte konnten nicht geladen werden.");
      return;
    }
    const j1 = (await r1.json()) as { baustelle: B };
    const j2 = (await r2.json()) as { berichte: Br[] };
    setB(j1.baustelle);
    setName(j1.baustelle.name);
    setAddress(j1.baustelle.address ?? "");
    setCustomer(j1.baustelle.customer_name ?? "");
    setNotes(j1.baustelle.notes ?? "");
    setList(j2.berichte ?? []);
  }, [id]);

  useEffect(() => {
    setLoad(true);
    void fetchData().finally(() => setLoad(false));
  }, [id, fetchData]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaveBusy(true);
    try {
      const res = await fetch(`/api/baustellen/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || null,
          customer_name: customer.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) setErr("Speichern fehlgeschlagen.");
      else void fetchData();
    } finally {
      setSaveBusy(false);
    }
  }

  if (load) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500" aria-busy="true">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Laden …
      </div>
    );
  }

  if (!b) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{err ?? "Nicht gefunden."}</p>
        <Link href="/baustellen" className="text-sm font-medium text-primary hover:underline">
          Zur Übersicht
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/baustellen" className="text-sm font-medium text-primary hover:underline">
          ← Baustellen
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{b.name}</h1>
      </div>
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Stammdaten</h2>
        <form onSubmit={save} className="mt-4 space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-800">Name</label>
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800">Adresse</label>
            <Textarea className="mt-1" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800">Kunde / Ansprechort</label>
            <Input className="mt-1" value={customer} onChange={(e) => setCustomer(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800">Notizen</label>
            <Textarea className="mt-1" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <Button type="submit" disabled={saveBusy}>
            {saveBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span className="ml-2">Speichern …</span>
              </>
            ) : (
              "Speichern"
            )}
          </Button>
        </form>
      </Card>
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Berichte</h2>
          <Link
            href={`/baustellen/${id}/berichte/neu`}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            + Bericht erstellen
          </Link>
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-slate-600">Noch keine Berichte.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {list.map((r) => (
              <li key={r.id}>
                <Link href={`/berichte/${r.id}`} className="block px-4 py-3 hover:bg-slate-50">
                  <span className="font-medium text-slate-900">{r.title}</span>
                  <span className="ml-2 text-sm text-slate-500">{r.report_date}</span>
                  <span className="ml-2 text-xs uppercase text-slate-400">{r.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
