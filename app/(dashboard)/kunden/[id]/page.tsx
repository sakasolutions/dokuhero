"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Pencil, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";

type KundeDetail = {
  id: number;
  name: string;
  email: string | null;
  telefon: string | null;
  adresse: string | null;
  fahrzeug: string | null;
  kennzeichen: string | null;
  notizen: string | null;
  erstellt_am: string;
};

type AuftragHistorie = {
  id: number;
  beschreibung: string | null;
  status: string;
  erstellt_am: string;
  abgeschlossen_am: string | null;
  protokoll_id: number | null;
  pdf_pfad: string | null;
  ki_text: string | null;
  gesendet_am: string | null;
  foto_anzahl: number;
};

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "offen") return "bg-amber-100 text-amber-800";
  if (s === "in_bearbeitung") return "bg-blue-100 text-blue-800";
  if (s === "abgeschlossen") return "bg-green-100 text-green-800";
  return "bg-slate-100 text-slate-800";
}

function statusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "offen") return "Offen";
  if (s === "in_bearbeitung") return "In Bearbeitung";
  if (s === "abgeschlossen") return "Abgeschlossen";
  return status;
}

function formatDatum(iso: string) {
  try {
    return new Date(iso).toLocaleString("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function kiPreview(text: string | null, max = 100): string | null {
  if (!text?.trim()) return null;
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export default function KundeDetailPage() {
  const params = useParams();
  const id = String(params.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kunde, setKunde] = useState<KundeDetail | null>(null);
  const [auftraege, setAuftraege] = useState<AuftragHistorie[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/kunden/${id}`);
        if (!res.ok) {
          if (!cancelled) setError("Kunde nicht gefunden.");
          return;
        }
        const data = (await res.json()) as {
          kunde: KundeDetail;
          auftraege: AuftragHistorie[];
        };
        if (cancelled) return;
        setKunde(data.kunde);
        setAuftraege(Array.isArray(data.auftraege) ? data.auftraege : []);
      } catch {
        if (!cancelled) setError("Laden fehlgeschlagen.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-slate-600">Laden…</p>
      </div>
    );
  }

  if (error || !kunde) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="text-red-600">{error ?? "Kunde nicht gefunden."}</p>
        <Link
          href="/kunden"
          className="text-sm font-medium text-primary hover:underline"
        >
          Zurück zur Kundenliste
        </Link>
      </div>
    );
  }

  const telHref = kunde.telefon?.trim()
    ? `tel:${kunde.telefon.replace(/\s/g, "")}`
    : null;
  const mailHref = kunde.email?.trim() ? `mailto:${kunde.email.trim()}` : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Link
        href="/kunden"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Liste
      </Link>

      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {kunde.name}
            </h1>
            {(kunde.fahrzeug?.trim() || kunde.kennzeichen?.trim()) && (
              <p className="text-slate-600">
                {[kunde.fahrzeug?.trim(), kunde.kennzeichen?.trim()]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <div className="flex flex-col gap-1.5 text-sm sm:flex-row sm:flex-wrap sm:gap-x-4">
              {telHref ? (
                <a
                  href={telHref}
                  className="font-medium text-primary hover:underline"
                >
                  {kunde.telefon}
                </a>
              ) : (
                <span className="text-slate-400">Kein Telefon</span>
              )}
              {mailHref ? (
                <a
                  href={mailHref}
                  className="font-medium text-primary hover:underline"
                >
                  {kunde.email}
                </a>
              ) : (
                <span className="text-slate-400">Keine E-Mail</span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Link
              href={`/kunden/${id}/bearbeiten`}
              className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 sm:w-auto"
            >
              <Pencil className="h-4 w-4" />
              Bearbeiten
            </Link>
            <Link
              href={`/auftraege/neu?kunde_id=${kunde.id}`}
              className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Neuer Auftrag
            </Link>
          </div>
        </div>
      </header>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Auftragshistorie
        </h2>
        {auftraege.length === 0 ? (
          <Card className="border-dashed border-slate-200 bg-slate-50/50">
            <p className="text-sm text-slate-600">
              Noch keine Aufträge für diesen Kunden.
            </p>
            <Link
              href={`/auftraege/neu?kunde_id=${kunde.id}`}
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Ersten Auftrag anlegen
            </Link>
          </Card>
        ) : (
          <ul className="space-y-4">
            {auftraege.map((a) => {
              const hasProtokoll =
                a.protokoll_id != null && Number.isFinite(a.protokoll_id);
              const pdfUrl = hasProtokoll
                ? `/uploads/pdfs/${a.protokoll_id}.pdf`
                : null;
              const preview = hasProtokoll ? kiPreview(a.ki_text) : null;

              return (
                <li key={`${a.id}-${a.protokoll_id ?? "np"}`}>
                  <Card className="border-slate-200">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-slate-500">
                          {formatDatum(a.erstellt_am)}
                        </p>
                        <p className="text-slate-800">
                          {a.beschreibung?.trim() || "—"}
                        </p>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(a.status)}`}
                        >
                          {statusLabel(a.status)}
                        </span>
                      </div>
                    </div>

                    {hasProtokoll ? (
                      <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/protokoll/${a.protokoll_id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                          >
                            <FileText className="h-4 w-4 text-primary" />
                            Protokoll ansehen
                          </Link>
                          <a
                            href={pdfUrl!}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                          >
                            PDF herunterladen
                          </a>
                        </div>
                        {preview ? (
                          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            <span className="font-medium text-slate-700">
                              KI-Text:{" "}
                            </span>
                            {preview}
                          </p>
                        ) : null}
                        {a.foto_anzahl > 0 ? (
                          <p className="text-xs text-slate-500">
                            {a.foto_anzahl}{" "}
                            {a.foto_anzahl === 1 ? "Foto" : "Fotos"}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <Link
                          href={`/protokoll/neu?auftrag_id=${a.id}`}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                        >
                          Protokoll erstellen
                        </Link>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
