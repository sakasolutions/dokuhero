"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

type Row = {
  id: number;
  auftrag_id: number;
  betrieb_id: number;
  betrieb_name: string;
  erstellt_am: string;
  gesendet_am: string | null;
  pdf_pfad: string | null;
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

export default function AdminProtokollePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/protokolle");
        if (!res.ok) {
          if (!cancelled) {
            setError(res.status === 403 ? "Kein Admin-Zugang." : "Laden fehlgeschlagen.");
          }
          return;
        }
        const data = (await res.json()) as { protokolle: Row[] };
        if (!cancelled) {
          setRows(data.protokolle ?? []);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Laden fehlgeschlagen.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Protokolle</h1>
        <p className="mt-1 text-slate-600">Letzte 500 Protokolle aller Betriebe.</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card padding={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Betrieb</th>
                <th className="px-4 py-3 font-medium">Auftrag</th>
                <th className="px-4 py-3 font-medium">Datum</th>
                <th className="px-4 py-3 font-medium">PDF</th>
                <th className="px-4 py-3 font-medium">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Laden…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Keine Protokolle.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 tabular-nums">{r.id}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/betriebe/${r.betrieb_id}`}
                        className="text-amber-500 hover:text-amber-600 hover:underline"
                      >
                        {r.betrieb_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{r.auftrag_id}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatDe(r.erstellt_am)}
                    </td>
                    <td className="px-4 py-3">
                      {r.gesendet_am ? (
                        <span className="text-emerald-700">Gesendet</span>
                      ) : (
                        <span className="text-slate-500">Nein</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.pdf_pfad ? (
                        <a
                          href={r.pdf_pfad}
                          className="text-amber-500 hover:text-amber-600 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          PDF
                        </a>
                      ) : (
                        "–"
                      )}
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
