"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type BetriebRow = {
  id: number;
  name: string;
  email: string;
  branche: string | null;
  erstellt_am: string;
  gesperrt: boolean;
  protokolle_anzahl: number;
};

function formatDe(iso: string) {
  try {
    return new Date(iso).toLocaleString("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminBetriebePage() {
  const [rows, setRows] = useState<BetriebRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    const res = await fetch("/api/admin/betriebe");
    if (!res.ok) {
      setError(res.status === 403 ? "Kein Admin-Zugang." : "Laden fehlgeschlagen.");
      setRows([]);
      return;
    }
    const data = (await res.json()) as { betriebe: BetriebRow[] };
    setRows(data.betriebe ?? []);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleGesperrt(id: number, aktuell: boolean) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/betriebe/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gesperrt: !aktuell }),
      });
      if (!res.ok) throw new Error("fail");
      await load();
    } catch {
      setError("Sperrstatus konnte nicht geändert werden.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Betriebe</h1>
        <p className="mt-1 text-slate-600">Alle registrierten Betriebe.</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card padding={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">E-Mail</th>
                <th className="px-4 py-3 font-medium">Branche</th>
                <th className="px-4 py-3 font-medium">Registriert</th>
                <th className="px-4 py-3 font-medium">Protokolle</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Laden…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Keine Betriebe.
                  </td>
                </tr>
              ) : (
                rows.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 tabular-nums text-slate-700">{b.id}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/betriebe/${b.id}`}
                        className="font-medium text-primary hover:text-primary/80 hover:underline"
                      >
                        {b.name}
                      </Link>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-slate-600">
                      {b.email}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{b.branche ?? "–"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatDe(b.erstellt_am)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {b.protokolle_anzahl}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          b.gesperrt
                            ? "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
                            : "rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
                        }
                      >
                        {b.gesperrt ? "Gesperrt" : "Aktiv"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        variant={b.gesperrt ? "outline" : "danger"}
                        className="min-h-9 px-3 py-1.5 text-xs"
                        disabled={busyId === b.id}
                        onClick={() => toggleGesperrt(b.id, b.gesperrt)}
                      >
                        {busyId === b.id
                          ? "…"
                          : b.gesperrt
                            ? "Entsperren"
                            : "Sperren"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
