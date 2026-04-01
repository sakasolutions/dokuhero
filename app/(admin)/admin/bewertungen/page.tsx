"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

type Row = {
  id: number;
  protokoll_id: number | null;
  betrieb_id: number;
  betrieb_name: string;
  zufrieden: number | null;
  feedback_text: string | null;
  erstellt_am: string;
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

export default function AdminBewertungenPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/bewertungen");
        if (!res.ok) {
          if (!cancelled) {
            setError(res.status === 403 ? "Kein Admin-Zugang." : "Laden fehlgeschlagen.");
          }
          return;
        }
        const data = (await res.json()) as { bewertungen: Row[] };
        if (!cancelled) {
          setRows(data.bewertungen ?? []);
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
        <h1 className="text-2xl font-bold text-slate-900">Bewertungen</h1>
        <p className="mt-1 text-slate-600">Letzte 500 Bewertungen aller Betriebe.</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card padding={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Betrieb</th>
                <th className="px-4 py-3 font-medium">Protokoll</th>
                <th className="px-4 py-3 font-medium">Zufrieden</th>
                <th className="px-4 py-3 font-medium">Datum</th>
                <th className="px-4 py-3 font-medium">Feedback</th>
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
                    Keine Bewertungen.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-slate-50/80">
                    <td className="px-4 py-3 tabular-nums">{r.id}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/betriebe/${r.betrieb_id}`}
                        className="text-primary hover:text-primary/80 hover:underline"
                      >
                        {r.betrieb_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{r.protokoll_id ?? "–"}</td>
                    <td className="px-4 py-3">
                      {r.zufrieden === 1 ? (
                        <span className="text-primary">Ja</span>
                      ) : r.zufrieden === 0 ? (
                        <span className="text-red-700">Nein</span>
                      ) : (
                        "–"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatDe(r.erstellt_am)}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-slate-700">
                      {r.feedback_text ? (
                        <span className="line-clamp-3 whitespace-pre-wrap">
                          {r.feedback_text}
                        </span>
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
