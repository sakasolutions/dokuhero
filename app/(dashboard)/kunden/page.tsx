"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { Kunde } from "@/types";

export default function KundenListePage() {
  const router = useRouter();
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/kunden");
        if (!res.ok) throw new Error("load");
        const data = (await res.json()) as Kunde[];
        if (!cancelled) setKunden(data);
      } catch {
        if (!cancelled) setError("Kunden konnten nicht geladen werden.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return kunden;
    return kunden.filter((k) => {
      const name = (k.name ?? "").toLowerCase();
      const plate = (k.kennzeichen ?? "").toLowerCase();
      return name.includes(s) || plate.includes(s);
    });
  }, [kunden, q]);

  async function handleDelete(id: number) {
    if (
      !window.confirm(
        "Diesen Kunden wirklich löschen? Dies kann fehlschlagen, wenn noch Aufträge existieren."
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/kunden/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(
          typeof json.error === "string"
            ? json.error
            : "Löschen fehlgeschlagen."
        );
        return;
      }
      setKunden((prev) => prev.filter((k) => k.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kunden</h1>
          <p className="text-slate-600">Alle Kunden deines Betriebs</p>
        </div>
        <Link
          href="/kunden/neu"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Neuer Kunde
        </Link>
      </div>

      <Input
        placeholder="Suche nach Name oder Kennzeichen…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-md"
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="text-slate-600">Laden…</p>
      ) : (
        <>
          {/* Desktop: Tabelle */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">Name</th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Fahrzeug
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Kennzeichen
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Telefon
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-700">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((k) => (
                  <tr
                    key={k.id}
                    role="link"
                    tabIndex={0}
                    className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50"
                    onClick={() => router.push(`/kunden/${k.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/kunden/${k.id}`);
                      }
                    }}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {k.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {k.fahrzeug ?? "–"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {k.kennzeichen ?? "–"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {k.telefon ?? "–"}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/kunden/${k.id}`}
                          className="text-sm font-medium text-primary hover:text-primary/80 hover:underline"
                        >
                          Details
                        </Link>
                        <Link
                          href={`/kunden/${k.id}/bearbeiten`}
                          title="Bearbeiten"
                          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <Button
                          variant="danger"
                          className="!p-2"
                          title="Löschen"
                          disabled={deletingId === k.id}
                          onClick={() => handleDelete(k.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-slate-500">
                Keine Kunden gefunden.
              </p>
            ) : null}
          </div>

          {/* Mobile: Cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((k) => (
              <Card
                key={k.id}
                padding={false}
                className="relative overflow-hidden"
              >
                <Link
                  href={`/kunden/${k.id}`}
                  className="absolute inset-0 z-0 rounded-xl"
                  aria-label={`Details zu ${k.name}`}
                />
                <div className="relative z-10 space-y-2 p-4 pr-[4.5rem] pointer-events-none">
                  <p className="font-semibold text-slate-900">{k.name}</p>
                  <p className="text-sm text-slate-600">
                    <span className="text-slate-400">Fahrzeug: </span>
                    {k.fahrzeug ?? "–"}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="text-slate-400">Kennzeichen: </span>
                    {k.kennzeichen ?? "–"}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="text-slate-400">Telefon: </span>
                    {k.telefon ?? "–"}
                  </p>
                </div>
                <div className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 gap-1 pointer-events-auto">
                  <Link
                    href={`/kunden/${k.id}/bearbeiten`}
                    title="Bearbeiten"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-1.5 text-slate-800 shadow-sm hover:bg-slate-50"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <Button
                    variant="danger"
                    className="!p-1.5"
                    title="Löschen"
                    disabled={deletingId === k.id}
                    onClick={() => handleDelete(k.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
            {filtered.length === 0 ? (
              <p className="text-center text-slate-500">Keine Kunden gefunden.</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
