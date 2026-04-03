"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Archive, FileText, Loader2, Pencil, Plus, Search, X } from "lucide-react";
import { protokollStatusLabel } from "@/lib/protokoll-status-label";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { AuftragMitKunde, AuftragStatus } from "@/types";

type StatusTab = "alle" | AuftragStatus | "freigegeben";

function formatAuftragsNrAnzeige(a: AuftragMitKunde): string {
  return a.auftragsnummer?.trim() || String(a.id).padStart(4, "0");
}

function AuftragStatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    offen: "bg-amber-100 text-amber-800 ring-1 ring-amber-200/80",
    in_bearbeitung: "bg-sky-100 text-sky-800 ring-1 ring-sky-200/80",
    abgeschlossen: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80",
  };
  const labels: Record<string, string> = {
    offen: "Offen",
    in_bearbeitung: "In Bearbeitung",
    abgeschlossen: "Abgeschlossen",
  };
  const cls = styles[status] ?? "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function AuftragListenBadge({ a }: { a: AuftragMitKunde }) {
  const ps =
    a.protokoll_id != null && a.protokoll_status ? a.protokoll_status : null;
  if (ps) {
    const protoStyles: Record<string, string> = {
      zur_pruefung: "bg-amber-100 text-amber-900 ring-1 ring-amber-200",
      entwurf: "bg-blue-100 text-blue-800 ring-1 ring-blue-200",
      freigegeben: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200",
    };
    const cls = protoStyles[ps] ?? "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}
      >
        {protokollStatusLabel(ps)}
      </span>
    );
  }
  return <AuftragStatusPill status={a.status} />;
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
  const [statusTab, setStatusTab] = useState<StatusTab>("alle");
  const [archivFilter, setArchivFilter] = useState<ArchivFilter>("aktiv");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

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

  const byStatusTab = useMemo(() => {
    return auftraege.filter((a) => {
      if (statusTab === "alle") return true;
      if (statusTab === "freigegeben")
        return a.protokoll_status === "freigegeben";
      return a.status === statusTab;
    });
  }, [auftraege, statusTab]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byStatusTab;
    return byStatusTab.filter((a) => {
      const nr = formatAuftragsNrAnzeige(a).toLowerCase();
      const kunde = (a.kunde_name ?? "").toLowerCase();
      return nr.includes(q) || kunde.includes(q);
    });
  }, [byStatusTab, searchQuery]);

  const filteredIds = useMemo(() => filtered.map((a) => a.id), [filtered]);

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
    if (allFilteredSelected) setSelectedIds([]);
    else setSelectedIds([...filteredIds]);
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
      body: JSON.stringify({ ids: selectedIds, action: "archivieren" }),
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

  const statusTabs: { key: StatusTab; label: string }[] = [
    { key: "alle", label: "Alle" },
    { key: "offen", label: "Offen" },
    { key: "in_bearbeitung", label: "In Bearbeitung" },
    { key: "freigegeben", label: "Freigegeben" },
  ];

  return (
    <div className="space-y-6">
      {showBulkChrome ? (
        <div
          className={`fixed left-0 right-0 top-14 z-30 border-b border-stone-200/90 bg-white/95 shadow-md backdrop-blur-sm transition-[transform,opacity] duration-200 ease-out lg:left-[240px] ${
            hasSelection
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-full opacity-0"
          }`}
          role="toolbar"
          aria-hidden={!hasSelection}
        >
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="text-sm font-medium text-stone-800">
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Aufträge
          </h1>
          <p className="mt-1 text-sm text-stone-600 sm:text-base">
            Alle Aufträge deines Betriebs
          </p>
        </div>
        {archivFilter === "aktiv" ? (
          <Link
            href="/auftraege/neu"
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto sm:py-2.5"
          >
            <Plus className="h-4 w-4" />
            Neuer Auftrag
          </Link>
        ) : null}
      </div>

      {freigabeOnly ? (
        <div
          className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          Es werden nur Aufträge angezeigt, deren aktuelles Protokoll{" "}
          <strong>Zur Freigabe bereit</strong> ist.{" "}
          <Link
            href="/auftraege"
            className="font-semibold text-amber-950 underline decoration-amber-700/40 underline-offset-2 hover:decoration-amber-800"
          >
            Alle Aufträge anzeigen
          </Link>
        </div>
      ) : null}

      {successMsg ? (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          {successMsg}
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-stone-700">Ansicht</span>
          <div className="inline-flex w-full max-w-md rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setArchivFilter("aktiv")}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition sm:py-2 ${
                archivFilter === "aktiv"
                  ? "bg-primary text-white shadow-sm"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              Aktiv
            </button>
            <button
              type="button"
              onClick={() => setArchivFilter("archiv")}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition sm:py-2 ${
                archivFilter === "archiv"
                  ? "bg-primary text-white shadow-sm"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              Ältere anzeigen
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-stone-700">Status</span>
          <div className="-mx-1 overflow-x-auto pb-1">
            <div
              className="inline-flex min-w-min gap-1 rounded-xl border border-stone-200 bg-white p-1 shadow-sm"
              role="tablist"
              aria-label="Status-Filter"
            >
              {statusTabs.map(({ key, label }) => {
                const active = statusTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setStatusTab(key)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ${
                      active
                        ? "bg-primary text-white shadow-sm"
                        : "text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="relative max-w-lg">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Auftragsnr. oder Kunde suchen…"
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoComplete="off"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-stone-600">
          <Loader2
            className="h-10 w-10 animate-spin text-primary"
            strokeWidth={2}
            aria-hidden
          />
          <p className="text-sm font-medium">Laden…</p>
        </div>
      ) : (
        <>
          {/* Desktop: styled rows */}
          <div className="hidden md:block">
            <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm">
              <div
                className={`grid gap-3 border-b border-stone-100 bg-stone-50/90 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500 ${
                  showBulkChrome
                    ? "grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto]"
                    : "grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto]"
                }`}
              >
                {showBulkChrome ? (
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-stone-300 text-primary focus:ring-primary/30"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      disabled={filteredIds.length === 0}
                      title="Alle sichtbaren auswählen"
                      aria-label="Alle sichtbaren Aufträge auswählen"
                    />
                  </div>
                ) : null}
                <span>Auftragsnr.</span>
                <span>Kunde</span>
                <span>Status</span>
                <span>Datum</span>
                <span className="text-right">Aktionen</span>
              </div>
              <div className="divide-y divide-stone-100">
                {filtered.map((a) => {
                  const selected = selectedIds.includes(a.id);
                  const showProto =
                    a.status === "in_bearbeitung" && a.protokoll_id != null;
                  return (
                    <div
                      key={a.id}
                      className={`group/row grid items-center gap-3 px-4 py-3 transition hover:bg-stone-50/80 ${
                        showBulkChrome
                          ? "grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto]"
                          : "grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto]"
                      } ${selected ? "bg-sky-50/50" : ""}`}
                    >
                      {showBulkChrome ? (
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            className={`h-4 w-4 rounded border-stone-300 text-primary focus:ring-primary/30 ${
                              hasSelection
                                ? "opacity-100"
                                : "opacity-0 group-hover/row:opacity-100"
                            }`}
                            checked={selected}
                            onChange={() => toggleSelected(a.id)}
                            aria-label={`Auftrag ${a.id} auswählen`}
                          />
                        </div>
                      ) : null}
                      <span className="font-semibold tabular-nums text-stone-900">
                        {formatAuftragsNrAnzeige(a)}
                      </span>
                      <span className="truncate font-medium text-stone-800">
                        {a.kunde_name ?? "–"}
                      </span>
                      <div className="min-w-0">
                        <AuftragListenBadge a={a} />
                      </div>
                      <span className="whitespace-nowrap text-sm text-stone-600">
                        {formatDate(a.erstellt_am)}
                      </span>
                      <div className="flex items-center justify-end gap-1">
                        {showProto ? (
                          <Link
                            href={`/protokoll/${a.protokoll_id}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-primary transition hover:bg-primary/10 hover:text-primary"
                            title="Protokoll ansehen"
                            aria-label="Protokoll ansehen"
                          >
                            <FileText className="h-4 w-4" strokeWidth={2} />
                          </Link>
                        ) : (
                          <span
                            className="inline-flex h-9 w-9 shrink-0"
                            aria-hidden
                          />
                        )}
                        <Link
                          href={`/auftraege/${a.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
                          title="Auftrag öffnen"
                          aria-label="Auftrag öffnen"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={2} />
                        </Link>
                        {archivFilter === "aktiv" &&
                        session?.user?.rolle === "inhaber" ? (
                          <button
                            type="button"
                            onClick={() => void archiveAuftrag(a.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-stone-500 transition hover:bg-red-50 hover:text-red-700"
                            title="Archivieren"
                            aria-label="Auftrag archivieren"
                          >
                            <Archive className="h-4 w-4" strokeWidth={2} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              {filtered.length === 0 ? (
                <p className="p-8 text-center text-sm text-stone-500">
                  Keine Aufträge für diese Filter oder Suche.
                </p>
              ) : null}
            </div>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((a) => {
              const selected = selectedIds.includes(a.id);
              const showProto =
                a.status === "in_bearbeitung" && a.protokoll_id != null;
              return (
                <Card
                  key={a.id}
                  className={`group/card relative overflow-hidden border-stone-200/90 p-4 shadow-sm transition hover:border-stone-300 ${
                    selected ? "ring-2 ring-primary/40 bg-sky-50/40" : ""
                  }`}
                >
                  {showBulkChrome ? (
                    <div
                      className={`absolute left-3 top-3 z-10 transition-opacity ${
                        hasSelection
                          ? "opacity-100"
                          : "opacity-0 group-hover/card:opacity-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-stone-300 text-primary focus:ring-primary/30"
                        checked={selected}
                        onChange={() => toggleSelected(a.id)}
                        aria-label={`Auftrag ${a.id} auswählen`}
                      />
                    </div>
                  ) : null}
                  <div
                    className={`flex flex-col gap-3 ${showBulkChrome ? "pl-8" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-base font-bold tabular-nums text-stone-900">
                        {formatAuftragsNrAnzeige(a)}
                      </p>
                      <AuftragListenBadge a={a} />
                    </div>
                    <p className="text-sm font-medium text-stone-800">
                      {a.kunde_name ?? "–"}
                    </p>
                    <p className="text-xs text-stone-500">
                      {formatDate(a.erstellt_am)}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-stone-100 pt-3">
                      {showProto ? (
                        <Link
                          href={`/auftraege/${a.id}`}
                          className="text-sm font-semibold text-primary hover:text-primary/80 hover:underline"
                        >
                          Protokoll ansehen
                        </Link>
                      ) : null}
                      <Link
                        href={`/auftraege/${a.id}`}
                        className="text-sm font-semibold text-stone-600 hover:text-stone-900 hover:underline"
                      >
                        Bearbeiten
                      </Link>
                      {archivFilter === "aktiv" &&
                      session?.user?.rolle === "inhaber" ? (
                        <button
                          type="button"
                          onClick={() => void archiveAuftrag(a.id)}
                          className="inline-flex items-center justify-center rounded-lg p-1.5 text-stone-500 transition hover:bg-red-50 hover:text-red-700"
                          title="Archivieren"
                          aria-label="Auftrag archivieren"
                        >
                          <Archive className="h-4 w-4 shrink-0" strokeWidth={2} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-500">
                Keine Aufträge für diese Filter oder Suche.
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
