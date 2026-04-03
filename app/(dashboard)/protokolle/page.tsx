"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FileText, Loader2 } from "lucide-react";
import { ProtokollStatusBadge } from "@/components/ProtokollStatusBadge";
import { Card } from "@/components/ui/Card";

type ProtokollTab = "alle" | "zur_pruefung" | "entwurf" | "freigegeben";

type ProtokollListeItem = {
  id: number;
  status: string;
  notiz: string | null;
  ki_text: string | null;
  pdf_pfad: string | null;
  erstellt_am: string | Date;
  auftrag_beschreibung: string | null;
  auftrag_id: number;
  kunde_name: string | null;
  fahrzeug: string | null;
  kennzeichen: string | null;
};

function formatDatumTTMMJJJJ(d: string | Date): string {
  try {
    return new Date(d).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "–";
  }
}

function fahrzeugZeile(p: ProtokollListeItem): string | null {
  const teile = [p.fahrzeug?.trim(), p.kennzeichen?.trim()].filter(
    (s): s is string => Boolean(s && s.length > 0)
  );
  return teile.length > 0 ? teile.join(" · ") : null;
}

export default function ProtokollePage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [alle, setAlle] = useState<ProtokollListeItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ProtokollTab>("alle");

  useEffect(() => {
    if (sessionStatus !== "loading" && session?.user?.rolle === "mitarbeiter") {
      router.replace("/protokoll/neu");
    }
  }, [sessionStatus, session?.user?.rolle, router]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (session?.user?.rolle === "mitarbeiter") return;

    let alive = true;
    (async () => {
      setLoadingData(true);
      setError(null);
      try {
        const res = await fetch("/api/protokolle");
        if (!res.ok) throw new Error("load");
        const j = (await res.json()) as { protokolle?: ProtokollListeItem[] };
        const list = Array.isArray(j.protokolle) ? j.protokolle : [];
        if (alive) setAlle(list);
      } catch {
        if (alive) setError("Protokolle konnten nicht geladen werden.");
      } finally {
        if (alive) setLoadingData(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [sessionStatus, session?.user?.rolle]);

  const countZurFreigabe = useMemo(
    () => alle.filter((p) => p.status === "zur_pruefung").length,
    [alle]
  );

  const gefiltert = useMemo(() => {
    if (tab === "alle") return alle;
    return alle.filter((p) => p.status === tab);
  }, [alle, tab]);

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-600">
        <Loader2
          className="h-10 w-10 animate-spin text-primary"
          strokeWidth={2}
          aria-hidden
        />
        <p className="text-sm font-medium">Laden…</p>
      </div>
    );
  }

  if (session?.user?.rolle === "mitarbeiter") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-600">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          strokeWidth={2}
          aria-hidden
        />
        <p className="text-sm">Weiterleitung…</p>
      </div>
    );
  }

  const tabs: { key: ProtokollTab; label: string; showFreigabeBadge?: boolean }[] =
    [
      { key: "alle", label: "Alle" },
      { key: "zur_pruefung", label: "Zur Freigabe", showFreigabeBadge: true },
      { key: "entwurf", label: "Entwürfe" },
      { key: "freigegeben", label: "Freigegeben" },
    ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Protokolle</h1>
          <span
            className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-semibold tabular-nums text-slate-800"
            aria-label={`${alle.length} Protokolle gesamt`}
          >
            {alle.length}
          </span>
        </div>
        <p className="text-slate-600">Alle Protokolle deines Betriebs</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">Ansicht</span>
        <div className="-mx-1 overflow-x-auto pb-1">
          <div
            className="inline-flex min-w-min gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
            role="tablist"
            aria-label="Protokoll-Filter"
          >
            {tabs.map(({ key, label, showFreigabeBadge }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(key)}
                  className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition sm:px-4 ${
                    active
                      ? "bg-primary text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{label}</span>
                  {showFreigabeBadge ? (
                    <span
                      className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-orange-100 text-orange-900 ring-1 ring-orange-200"
                      }`}
                    >
                      {countZurFreigabe}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loadingData ? (
        <p className="text-slate-600">Laden…</p>
      ) : alle.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <div className="rounded-full bg-slate-100 p-4 text-slate-500">
            <FileText className="h-10 w-10" strokeWidth={1.5} aria-hidden />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">
              Noch keine Protokolle
            </p>
            <p className="mt-1 max-w-sm text-sm text-slate-600">
              Sobald du Aufträge protokollierst, erscheinen sie hier mit Status
              und Freigabe-Übersicht.
            </p>
          </div>
        </Card>
      ) : gefiltert.length === 0 ? (
        <Card className="px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-800">
            Keine Protokolle in dieser Ansicht.
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Wähle einen anderen Tab oder lege ein neues Protokoll an.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {gefiltert.map((p) => {
            const fz = fahrzeugZeile(p);
            return (
              <Card
                key={p.id}
                className="overflow-hidden p-4 shadow-sm transition hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">
                      {p.kunde_name?.trim() || "–"}
                    </p>
                    {fz ? (
                      <p className="mt-0.5 text-xs text-slate-500">{fz}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0">
                    <ProtokollStatusBadge status={p.status} />
                  </div>
                </div>
                <p className="mt-3 truncate text-sm text-slate-600">
                  {p.auftrag_beschreibung?.trim() || "–"}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    {formatDatumTTMMJJJJ(p.erstellt_am)}
                  </p>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {p.status === "zur_pruefung" ? (
                      <Link
                        href={`/protokoll/${p.id}`}
                        className="inline-flex items-center justify-center rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                      >
                        Freigeben
                      </Link>
                    ) : null}
                    {p.status === "freigegeben" && p.pdf_pfad ? (
                      <a
                        href={p.pdf_pfad}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      >
                        PDF
                      </a>
                    ) : null}
                    {p.status === "entwurf" ? (
                      <Link
                        href={`/protokoll/${p.id}`}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      >
                        Ansehen
                      </Link>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
