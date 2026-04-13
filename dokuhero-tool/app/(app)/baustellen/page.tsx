"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Baustelle = {
  id: number;
  name: string;
  address: string | null;
};

export default function BaustellenPage() {
  const [list, setList] = useState<Baustelle[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    const res = await fetch("/api/baustellen");
    if (!res.ok) {
      setErr("Konnte Baustellen nicht laden.");
      return;
    }
    const j = (await res.json()) as { baustellen: Baustelle[] };
    setList(j.baustellen ?? []);
  }, []);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const res = await fetch("/api/baustellen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), address: address.trim() || null }),
      });
      if (!res.ok) {
        setErr("Anlegen fehlgeschlagen.");
        return;
      }
      setName("");
      setAddress("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Baustellen</h1>
        <p className="mt-1 text-sm text-slate-600">Anlegen und öffnen</p>
      </div>

      <form onSubmit={onCreate} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm font-medium text-slate-800">Neue Baustelle</div>
        <input
          required
          placeholder="Bezeichnung"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Adresse (optional)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "…" : "Speichern"}
        </button>
      </form>

      <div>
        <h2 className="mb-2 text-sm font-medium text-slate-700">Alle</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Laden …</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Baustelle.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {list.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/baustellen/${b.id}`}
                  className="block px-4 py-3 text-sm hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-900">{b.name}</span>
                  {b.address ? (
                    <span className="mt-0.5 block text-slate-600">{b.address}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
