"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Archive, Plus, X } from "lucide-react";
import { protokollStatusLabel } from "@/lib/protokoll-status-label";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { AuftragMitKunde, AuftragStatus } from "@/types";

const STATUS_OPTIONS: { value: AuftragStatus | "alle"; label: string }[] = [
  { value: "alle", label: "Alle Status" },
  { value: "offen", label: "Offen" },
  { value: "in_bearbeitung", label: "In Bearbeitung" },
  { value: "abgeschlossen", label: "Abgeschlossen" },
];

function formatAuftragsNrAnzeige(a: AuftragMitKunde): string {
  const n = a.auftragsnummer?.trim() || String(a.id).padStart(4, "0");
  return `#${n}`;
}

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

/** Ein Badge: Protokoll-Status hat Vorrang, sonst Auftrags-Status. */
function AuftragListenBadge({ a }: { a: AuftragMitKunde }) {
  const ps =
    a.protokoll_id != null && a.protokoll_status
      ? a.protokoll_status
      : null;
  if (ps) {
    const protoStyles: Record<string, string> = {
      zur_pruefung: "bg-amber-100 text-amber-800",
      entwurf: "bg-blue-100 text-blue-700",
      freigegeben: "bg-green-100 text-green-800",
    };
    const cls = protoStyles[ps] ?? "bg-slate-100 text-slate-700";
    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
      >
        {protokollStatusLabel(ps)}
      </span>
    );
  }
  return <StatusBadge status={a.status} />;
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

type ArchivFilter = "aktiv" | "archiv";

export default function AuftraegeListePage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const freigabeOnly = searchParams.get("freigabe") === "1";

  const [auftraege, setAuftraege] = useState<AuftragMitKunde[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AuftragStatus | "alle">(
    "alle"
  );
  const [archivFilter, setArchivFilter] = useState<ArchivFilter>("aktiv");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (freigabeOnly) params.set("protokoll_status", "zur_pruefung");
        if (archivFilter === "archiv") params.set("archiv", "1");
        const q = params.toString();
        const url = q ? `/api/auftraege?${q}` : "/api/auftraege";
        const res = await fetch(url);
        if (!res.ok) throw new Error("load");
        const data = (await res.json()) as AuftragMitKunde[];
        if (alive) setAuftraege(data);
      } catch {
        if (alive) setError("Aufträge konnten nicht geladen werden.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [freigabeOnly, archivFilter, refreshKey]);

  useEffect(() => {
    setSelectedIds([]);
  }, [archivFilter]);

  const filtered = useMemo(() => {
    if (statusFilter === "alle") return auftraege;
    return auftraege.filter((a) => a.status === statusFilter);
  }, [auftraege, statusFilter]);

  const filteredIds = useMemo(
    () => filtered.map((a) => a.id),
    [filtered]
  );

  const hasSelection = selectedIds.length > 0;
  const showBulkChrome = archivFilter === "aktiv";

  const allFilteredSelected =
    filteredIds.length > 0 &&
    filteredIds.every((id) => selectedIds.includes(id));

  function toggleSelected(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds([...filteredIds]);
    }
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  async function archiveAuftrag(auftragId: number) {
    const ok = window.confirm(
      "Auftrag archivieren? Er bleibt gespeichert und ist im Archiv abrufbar."
    );
    if (!ok) return;
    const res = await fetch(`/api/auftraege/${auftragId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivieren: true }),
    });
    if (!res.ok) {
      setError("Archivieren fehlgeschlagen.");
      return;
    }
    setError(null);
    setAuftraege((prev) => prev.filter((a) => a.id !== auftragId));
    setSelectedIds((prev) => prev.filter((id) => id !== auftragId));
  }

  async function bulkArchivieren() {
    if (selectedIds.length === 0) return;
    const n = selectedIds.length;
    const ok = window.confirm(
      `${n} Aufträge archivieren? Sie bleiben 10 Jahre gespeichert.`
    );
    if (!ok) return;
    const res = await fetch("/api/auftraege/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: selectedIds,
        action: "archivieren",
      }),
    });
    const j = (await res.json().catch(() => ({}))) as {
      archiviert?: number;
      error?: unknown;
    };
    if (!res.ok) {
      setError(
        typeof j.error === "string"
          ? j.error
          : "Mehrfach-Archivieren fehlgeschlagen."
      );
      return;
    }
    setError(null);
    const count = typeof j.archiviert === "number" ? j.archiviert : n;
    setSuccessMsg(
      count === 1
        ? "1 Auftrag wurde archiviert."
        : `${count} Aufträge wurden archiviert.`
    );
    setSelectedIds([]);
    setRefreshKey((k) => k + 1);
    window.setTimeout(() => setSuccessMsg(null), 4500);
  }

  const checkboxCellClass = (selected: boolean) =>
    `w-12 shrink-0 px-2 py-3 align-middle ${
      selected ? "bg-blue-50/90" : ""
    }`;

  const checkboxClass = (selected: boolean) =>
    `h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30 transition-opacity duration-150 ${
      hasSelection ? "opacity-100" : "opacity-0 group-hover:opacity-100"
    }`;

  return (
    <div className="space-y-6">
      {showBulkChrome ? (
        <div
          className={`fixed left-0 right-0 top-14 z-30 border-b border-slate-200 bg-white/95 shadow-md backdrop-blur-sm transition-[transform,opacity] duration-200 ease-out lg:left-[240px] ${
            hasSelection
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-full opacity-0"
          }`}
          role="toolbar"
          aria-hidden={!hasSelection}
        >
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="text-sm font-medium text-slate-800">
              <span className="tabular-nums">{selectedIds.length}</span>{" "}
              ausgewählt
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {session?.user?.rolle === "inhaber" ? (
                <Button
                  type="button"
                  className="gap-2"
                  onClick={() => void bulkArchivieren()}
                >
                  <Archive className="h-4 w-4" />
                  Archivieren
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={clearSelection}
              >
                <X className="h-4 w-4" />
                Abbrechen
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Aufträge</h1>
          <p className="text-slate-600">Alle Aufträge deines Betriebs</p>
        </div>
        {archivFilter === "aktiv" ? (
          <Link
            href="/auftraege/neu"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Neuer Auftrag
          </Link>
        ) : null}
      </div>

      {freigabeOnly ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          Es werden nur Aufträge angezeigt, deren aktuelles Protokoll{" "}
          <strong>Zur Freigabe bereit</strong> ist.{" "}
          <Link
            href="/auftraege"
            className="font-medium text-amber-950 underline decoration-amber-700/50 underline-offset-2 hover:text-amber-950"
          >
            Alle Aufträge anzeigen
          </Link>
        </div>
      ) : null}

      {successMsg ? (
        <div
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          role="status"
        >
          {successMsg}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Ansicht</span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setArchivFilter("aktiv")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                archivFilter === "aktiv"
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Aktiv
            </button>
            <button
              type="button"
              onClick={() => setArchivFilter("archiv")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                archivFilter === "archiv"
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Ältere anzeigen
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <label className="text-sm font-medium text-slate-700">Status</label>
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
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="text-slate-600">Laden…</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr className="group/header">
                  {showBulkChrome ? (
                    <th
                      className={`w-12 px-2 py-3 align-middle transition-opacity ${
                        hasSelection
                          ? "opacity-100"
                          : "opacity-0 group-hover/header:opacity-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAll}
                        disabled={filteredIds.length === 0}
                        aria-label="Alle sichtbaren Aufträge auswählen"
                      />
                    </th>
                  ) : null}
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Kunde
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-700">
                    Auftragsnr.
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
                {filtered.map((a) => {
                  const selected = selectedIds.includes(a.id);
                  return (
                    <tr
                      key={a.id}
                      className={`group border-b border-slate-100 ${
                        selected ? "bg-blue-50" : ""
                      }`}
                    >
                      {showBulkChrome ? (
                        <td className={checkboxCellClass(selected)}>
                          <input
                            type="checkbox"
                            className={checkboxClass(selected)}
                            checked={selected}
                            onChange={() => toggleSelected(a.id)}
                            aria-label={`Auftrag ${a.id} auswählen`}
                          />
                        </td>
                      ) : null}
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {a.kunde_name ?? "–"}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 font-medium tabular-nums text-slate-800">
                        {formatAuftragsNrAnzeige(a)}
                      </td>
                      <td className="px-4 py-3">
                        <AuftragListenBadge a={a} />
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
                          {archivFilter === "aktiv" &&
                          session?.user?.rolle === "inhaber" ? (
                            <button
                              type="button"
                              onClick={() => void archiveAuftrag(a.id)}
                              className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
                              title="Auftrag archivieren"
                            >
                              <Archive className="h-4 w-4 shrink-0" />
                              Archivieren
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-slate-500">
                Keine Aufträge für diesen Filter.
              </p>
            ) : null}
          </div>

          <div className="space-y-3 md:hidden">
            {filtered.map((a) => {
              const selected = selectedIds.includes(a.id);
              return (
                <Card
                  key={a.id}
                  className={`group relative overflow-hidden transition-colors ${
                    selected ? "ring-2 ring-primary/50 bg-blue-50/60" : ""
                  }`}
                >
                  {showBulkChrome ? (
                    <div
                      className={`absolute left-3 top-3 z-10 ${
                        hasSelection ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      } transition-opacity`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                        checked={selected}
                        onChange={() => toggleSelected(a.id)}
                        aria-label={`Auftrag ${a.id} auswählen`}
                      />
                    </div>
                  ) : null}
                  <div
                    className={`flex flex-col gap-2 ${showBulkChrome ? "pl-9 pt-1" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        {a.kunde_name ?? "–"}
                      </span>
                      <div className="shrink-0">
                        <AuftragListenBadge a={a} />
                      </div>
                    </div>
                    <p className="text-sm font-medium tabular-nums text-slate-700">
                      {formatAuftragsNrAnzeige(a)}
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
                      {archivFilter === "aktiv" &&
                      session?.user?.rolle === "inhaber" ? (
                        <button
                          type="button"
                          onClick={() => void archiveAuftrag(a.id)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
                          title="Auftrag archivieren"
                        >
                          <Archive className="h-4 w-4 shrink-0" />
                          Archivieren
                        </button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
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
