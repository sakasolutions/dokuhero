"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { AuftragMitKunde, AuftragStatus } from "@/types";

const STATUS_OPTIONS: { value: AuftragStatus | "alle"; label: string }[] = [
  { value: "alle", label: "Alle Status" },
  { value: "offen", label: "Offen" },
  { value: "in_bearbeitung", label: "In Bearbeitung" },
  { value: "abgeschlossen", label: "Abgeschlossen" },
];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    offen: "bg-amber-100 text-amber-700",
    in_bearbeitung: "bg-blue-100 text-blue-700",
    abgeschlossen: "bg-green-100 text-green-700",
    gesperrt: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    offen: "Offen",
    in_bearbeitung: "In Bearbeitung",
    abgeschlossen: "Abgeschlossen",
    gesperrt: "Gesperrt",
  };
  const cls = styles[status] ?? "bg-slate-100 text-slate-800";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function formatDate(d: string | Date) {
  try {
    return new Date(d).toLocaleString("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "–";
  }
}

export default function AuftraegeListePage() {
  const searchParams = useSearchParams();
  const freigabeOnly = searchParams.get("freigabe") === "1";

  const [auftraege, setAuftraege] = useState<AuftragMitKunde[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AuftragStatus | "alle">(
    "alle"
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const url = freigabeOnly
          ? "/api/auftraege?protokoll_status=zur_pruefung"
          : "/api/auftraege";
        const res = await fetch(url);
        if (!res.ok) throw new Error("load");
        const data = (await res.json()) as AuftragMitKunde[];
        if (!cancelled) setAuftraege(data);
      } catch {
        if (!cancelled) setError("Aufträge konnten nicht geladen werden.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [freigabeOnly]);

  const filtered = useMemo(() => {
    if (statusFilter === "alle") return auftraege;
    return auftraege.filter((a) => a.status === statusFilter);
  }, [auftraege, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Aufträge</h1>
          <p className="text-slate-600">Alle Aufträge deines Betriebs</p>
        </div>
        <Link
          href="/auftraege/neu"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Neuer Auftrag
        </Link>
      </div>

      {freigabeOnly ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          Es werden nur Aufträge angezeigt, deren aktuelles Protokoll{" "}
          <strong>zur Prüfung</strong> steht.{" "}
          <Link
            href="/auftraege"
            className="font-medium text-amber-950 underline decoration-amber-700/50 underline-offset-2 hover:text-amber-950"
          >
            Alle Aufträge anzeigen
          </Link>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label className="text-sm font-medium text-slate-700">Filter</label>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as AuftragStatus | "alle")
          }
          className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-auto"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="text-slate-600">Laden…</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Kunde
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Beschreibung
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Status
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Datum
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-700">
                    Aktion
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {a.kunde_name ?? "–"}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600">
                      {a.beschreibung ?? "–"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatDate(a.erstellt_am)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end sm:gap-3">
                        {a.status === "in_bearbeitung" &&
                        a.protokoll_id != null ? (
                          <Link
                            href={`/protokoll/${a.protokoll_id}`}
                            className="text-sm font-medium text-primary hover:text-primary/80 hover:underline"
                          >
                            Protokoll ansehen
                          </Link>
                        ) : null}
                        <Link
                          href={`/auftraege/${a.id}`}
                          className="text-sm font-medium text-primary hover:text-primary/80 hover:underline"
                        >
                          Bearbeiten
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-slate-500">
                Keine Aufträge für diesen Filter.
              </p>
            ) : null}
          </div>

          <div className="space-y-3 md:hidden">
            {filtered.map((a) => (
              <Card key={a.id}>
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-900">
                      {a.kunde_name ?? "–"}
                    </span>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-sm text-slate-600">
                    {a.beschreibung ?? "–"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(a.erstellt_am)}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {a.status === "in_bearbeitung" &&
                    a.protokoll_id != null ? (
                      <Link
                        href={`/protokoll/${a.protokoll_id}`}
                        className="text-sm font-medium text-primary hover:text-primary/80 hover:underline"
                      >
                        Protokoll ansehen
                      </Link>
                    ) : null}
                    <Link
                      href={`/auftraege/${a.id}`}
                      className="text-sm font-medium text-primary hover:text-primary/80 hover:underline"
                    >
                      Bearbeiten
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
            {filtered.length === 0 ? (
              <p className="text-center text-slate-500">
                Keine Aufträge für diesen Filter.
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
