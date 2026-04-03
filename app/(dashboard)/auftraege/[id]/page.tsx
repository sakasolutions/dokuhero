"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlignLeft, ArrowLeft, Loader2, Plus } from "lucide-react";
import { ProtokollStatusBadge } from "@/components/ProtokollStatusBadge";
import { Card } from "@/components/ui/Card";
import type {
  AuftragMitProtokollen,
  AuftragStatus,
  ProtokollListeEintrag,
} from "@/types";

const AUFTRAG_STATUS_OPTIONS: { value: AuftragStatus; label: string }[] = [
  { value: "offen", label: "Offen" },
  { value: "in_bearbeitung", label: "In Bearbeitung" },
  { value: "abgeschlossen", label: "Abgeschlossen" },
];

function formatAuftragsAnzeige(id: string, auftragsnummer: string | null) {
  return auftragsnummer?.trim() || String(id).padStart(4, "0");
}

function formatAuftragMetaDatum(d: string | Date) {
  try {
    return new Date(d).toLocaleString("de-DE", {
      dateStyle: "long",
      timeStyle: "short",
    });
  } catch {
    return "–";
  }
}

function formatProtokollDatum(iso: string) {
  try {
    return new Date(iso).toLocaleString("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function notizFirstLine(text: string | null | undefined): string | null {
  const t = text?.trim();
  if (!t) return null;
  const line = t.split(/\r?\n/)[0]?.trim();
  return line || null;
}

function AuftragStatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    offen: "bg-amber-100 text-amber-900 ring-1 ring-amber-200",
    in_bearbeitung: "bg-sky-100 text-sky-900 ring-1 ring-sky-200",
    abgeschlossen: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200",
  };
  const labels: Record<string, string> = {
    offen: "Offen",
    in_bearbeitung: "In Bearbeitung",
    abgeschlossen: "Abgeschlossen",
  };
  const cls = styles[status] ?? "bg-stone-100 text-stone-800 ring-1 ring-stone-200";
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${cls}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

export default function AuftragUebersichtPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);
  const { data: session } = useSession();
  const isInhaber = session?.user?.rolle === "inhaber";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kundeName, setKundeName] = useState<string | null>(null);
  const [kundeId, setKundeId] = useState<number | null>(null);
  const [auftragsnummer, setAuftragsnummer] = useState<string | null>(null);
  const [erstelltAm, setErstelltAm] = useState<string>("");
  const [auftragStatus, setAuftragStatus] = useState<AuftragStatus>("offen");
  const [protokolle, setProtokolle] = useState<ProtokollListeEintrag[]>([]);
  const [auftragArchiviert, setAuftragArchiviert] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/auftraege/${id}`);
    if (!res.ok) {
      setError("Auftrag nicht gefunden.");
      return;
    }
    const a = (await res.json()) as AuftragMitProtokollen & {
      archiviert?: number;
    };
    setAuftragArchiviert(Number(a.archiviert) === 1);
    setKundeName(a.kunde_name ?? null);
    setKundeId(a.kunde_id ?? null);
    setAuftragsnummer(a.auftragsnummer ?? null);
    setErstelltAm(
      typeof a.erstellt_am === "string" ? a.erstellt_am : String(a.erstellt_am)
    );
    setAuftragStatus(a.status as AuftragStatus);
    setProtokolle(Array.isArray(a.protokolle) ? a.protokolle : []);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch {
        if (!cancelled) setError("Laden fehlgeschlagen.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function onStatusChange(next: AuftragStatus) {
    if (!isInhaber || auftragArchiviert || next === auftragStatus) return;
    setStatusSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/auftraege/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        setError("Status konnte nicht gespeichert werden.");
        return;
      }
      setAuftragStatus(next);
      router.refresh();
    } catch {
      setError("Netzwerkfehler beim Speichern.");
    } finally {
      setStatusSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-stone-600">
        <Loader2
          className="h-10 w-10 animate-spin text-primary"
          strokeWidth={2}
          aria-hidden
        />
        <p className="text-sm font-medium">Laden…</p>
      </div>
    );
  }

  if (error && protokolle.length === 0 && !kundeName && !auftragsnummer) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <p className="text-red-600">{error}</p>
        <Link
          href="/auftraege"
          className="text-sm font-semibold text-primary hover:underline"
        >
          Zurück zu Aufträgen
        </Link>
      </div>
    );
  }

  const nrDisplay = formatAuftragsAnzeige(id, auftragsnummer);
  const neuProtokollHref = `/protokoll/neu?auftrag_id=${encodeURIComponent(id)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <Link
        href="/auftraege"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:text-primary/85 hover:underline"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        Zurück zu Aufträgen
      </Link>

      {auftragArchiviert ? (
        <div
          className="rounded-2xl border border-stone-300 bg-stone-100/90 px-4 py-3 text-sm text-stone-800"
          role="status"
        >
          Dieser Auftrag ist <strong>archiviert</strong> — nur noch einsehbar.
          Unter <strong>Aufträge → Ältere anzeigen</strong> weiterhin abrufbar.
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Auftrag
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            {nrDisplay}
          </h1>
          {kundeId != null ? (
            <Link
              href={`/kunden/${kundeId}`}
              className="inline-block text-lg font-semibold text-primary hover:text-primary/85 hover:underline"
            >
              {kundeName ?? "Kunde"}
            </Link>
          ) : (
            <p className="text-lg font-semibold text-stone-800">
              {kundeName ?? "–"}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 gap-y-2">
            {isInhaber && !auftragArchiviert ? (
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="auftrag-status" className="sr-only">
                  Auftrags-Status
                </label>
                <select
                  id="auftrag-status"
                  value={auftragStatus}
                  disabled={statusSaving}
                  onChange={(e) =>
                    void onStatusChange(e.target.value as AuftragStatus)
                  }
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                >
                  {AUFTRAG_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {statusSaving ? (
                  <Loader2
                    className="h-4 w-4 animate-spin text-stone-400"
                    aria-hidden
                  />
                ) : null}
              </div>
            ) : (
              <AuftragStatusPill status={auftragStatus} />
            )}
            <span className="text-sm text-stone-500">
              Erstellt {formatAuftragMetaDatum(erstelltAm)}
            </span>
          </div>
        </div>
        {!auftragArchiviert ? (
          <Link
            href={neuProtokollHref}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:py-2.5"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Neues Protokoll
          </Link>
        ) : null}
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-stone-900">Protokolle</h2>

        {protokolle.length === 0 ? (
          <Card className="flex flex-col items-center gap-5 border-stone-200/90 px-6 py-14 text-center shadow-sm">
            <p className="max-w-sm text-base font-medium text-stone-800">
              Noch keine Protokolle — leg das erste an
            </p>
            {!auftragArchiviert ? (
              <Link
                href={neuProtokollHref}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Plus className="h-5 w-5" strokeWidth={2.5} />
                Neues Protokoll
              </Link>
            ) : null}
          </Card>
        ) : (
          <div className="space-y-3">
            {protokolle.map((p, index) => {
              const notizLine = notizFirstLine(p.notiz);
              return (
              <Card
                key={p.id}
                className="border-stone-200/90 p-4 shadow-sm transition hover:border-stone-300"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-500">
                      Protokoll #{p.protokoll_nummer ?? index + 1}
                    </span>
                    <p className="font-semibold text-stone-900">
                      {formatProtokollDatum(p.erstellt_am)}
                    </p>
                  </div>
                  <ProtokollStatusBadge status={p.status} />
                </div>
                {notizLine ? (
                  <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-sm italic text-slate-400">
                    <AlignLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="min-w-0 truncate">{notizLine}</span>
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/protokoll/${p.id}`}
                    className="inline-flex flex-1 min-w-[6rem] items-center justify-center rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50"
                  >
                    Öffnen
                  </Link>
                  {p.pdf_pfad ? (
                    <a
                      href={p.pdf_pfad}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 min-w-[6rem] items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                    >
                      PDF
                    </a>
                  ) : null}
                </div>
              </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
