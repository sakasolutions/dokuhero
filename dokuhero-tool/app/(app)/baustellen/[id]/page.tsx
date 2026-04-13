"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Baustelle = {
  id: number;
  name: string;
  address: string | null;
};

type BerichtRow = {
  id: number;
  report_date: string;
  status: string;
};

export default function BaustelleDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [b, setB] = useState<Baustelle | null>(null);
  const [berichte, setBerichte] = useState<BerichtRow[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setErr(null);
    const [r1, r2] = await Promise.all([
      fetch(`/api/baustellen/${id}`),
      fetch(`/api/baustellen/${id}/berichte`),
    ]);
    if (!r1.ok || !r2.ok) {
      setErr("Laden fehlgeschlagen.");
      setB(null);
      return;
    }
    const j1 = (await r1.json()) as { baustelle: Baustelle };
    const j2 = (await r2.json()) as { berichte: BerichtRow[] };
    setB(j1.baustelle);
    setName(j1.baustelle.name);
    setAddress(j1.baustelle.address ?? "");
    setBerichte(j2.berichte ?? []);
  }, [id]);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await fetch(`/api/baustellen/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), address: address.trim() || null }),
    });
    if (!res.ok) setErr("Speichern fehlgeschlagen.");
    else await load();
  }

  if (loading) return <p className="text-sm text-slate-500">Laden …</p>;
  if (!b) return <p className="text-sm text-red-600">{err ?? "Nicht gefunden."}</p>;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/baustellen" className="text-sm text-slate-600 hover:text-slate-900">
          ← Baustellen
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{b.name}</h1>
      </div>

      <form onSubmit={saveMeta} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm font-medium">Stammdaten</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <button
          type="submit"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          Speichern
        </button>
      </form>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700">Berichte</h2>
          <Link
            href={`/baustellen/${id}/berichte/neu`}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Neuer Bericht
          </Link>
        </div>
        {berichte.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Berichte.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {berichte.map((r) => (
              <li key={r.id}>
                <Link href={`/berichte/${r.id}`} className="block px-4 py-3 text-sm hover:bg-slate-50">
                  <span className="font-medium">Bericht #{r.id}</span>
                  <span className="ml-2 text-slate-500">{r.report_date}</span>
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
