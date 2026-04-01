"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Detail = {
  betrieb: {
    id: number;
    name: string;
    email: string;
    telefon: string | null;
    branche: string | null;
    adresse: string | null;
    logo_pfad: string | null;
    google_bewertung_link: string | null;
    erstellt_am: string | null;
    gesperrt: boolean;
  };
  kunden: Array<{
    id: number;
    name: string;
    email: string | null;
    telefon: string | null;
    adresse: string | null;
    erstellt_am: string | null;
  }>;
  protokolle: Array<{
    id: number;
    auftrag_id: number;
    erstellt_am: string | null;
    gesendet_am: string | null;
    pdf_pfad: string | null;
    notiz: string | null;
  }>;
  bewertungen: Array<{
    id: number;
    protokoll_id: number | null;
    zufrieden: number | null;
    feedback_text: string | null;
    erstellt_am: string | null;
  }>;
};

function formatDe(iso: string | null) {
  if (!iso) return "–";
  try {
    return new Date(iso).toLocaleString("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminBetriebDetailPage() {
  const params = useParams();
  const id = String(params.id);

  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/betriebe/${id}`);
    if (!res.ok) {
      setError(res.status === 404 ? "Betrieb nicht gefunden." : "Laden fehlgeschlagen.");
      setData(null);
      return;
    }
    setData((await res.json()) as Detail);
    setError(null);
  }, [id]);

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
  }, [load]);

  async function toggleGesperrt() {
    if (!data) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/betriebe/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gesperrt: !data.betrieb.gesperrt }),
      });
      if (!res.ok) throw new Error("fail");
      await load();
    } catch {
      setError("Sperrstatus konnte nicht geändert werden.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-slate-600">Laden…</p>
      </div>
    );
  }

  if (!data?.betrieb) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        {error ? <p className="text-red-600">{error}</p> : null}
        <Link
          href="/admin/betriebe"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Zur Liste
        </Link>
      </div>
    );
  }

  const { betrieb } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link
          href="/admin/betriebe"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Zur Liste
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{betrieb.name}</h1>
            <p className="mt-1 text-slate-600">Betrieb #{betrieb.id}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                betrieb.gesperrt
                  ? "rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800"
                  : "rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-primary"
              }
            >
              {betrieb.gesperrt ? "Gesperrt" : "Aktiv"}
            </span>
            <Button
              type="button"
              variant={betrieb.gesperrt ? "outline" : "danger"}
              disabled={busy}
              onClick={toggleGesperrt}
            >
              {busy ? "…" : betrieb.gesperrt ? "Entsperren" : "Sperren"}
            </Button>
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Stammdaten</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">E-Mail</dt>
            <dd className="font-medium text-slate-900">{betrieb.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Telefon</dt>
            <dd className="text-slate-900">{betrieb.telefon ?? "–"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Branche</dt>
            <dd className="text-slate-900">{betrieb.branche ?? "–"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Registriert am</dt>
            <dd className="text-slate-900">{formatDe(betrieb.erstellt_am)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Adresse</dt>
            <dd className="whitespace-pre-wrap text-slate-900">
              {betrieb.adresse ?? "–"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Google-Bewertungslink</dt>
            <dd className="break-all text-slate-900">
              {betrieb.google_bewertung_link ?? "–"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Logo (Pfad)</dt>
            <dd className="break-all text-slate-900">{betrieb.logo_pfad ?? "–"}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">
          Kunden ({data.kunden.length})
        </h2>
        {data.kunden.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Keine Kunden.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {data.kunden.map((k) => (
              <li key={k.id} className="py-3 text-sm">
                <p className="font-medium text-slate-900">{k.name}</p>
                <p className="text-slate-600">
                  {k.email ?? "–"} · {k.telefon ?? "–"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">
          Protokolle ({data.protokolle.length})
        </h2>
        {data.protokolle.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Keine Protokolle.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {data.protokolle.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    Protokoll #{p.id} · Auftrag #{p.auftrag_id}
                  </p>
                  <p className="text-slate-600">{formatDe(p.erstellt_am)}</p>
                  <p className="text-slate-600">
                    PDF: {p.gesendet_am ? "gesendet" : "nicht gesendet"}
                  </p>
                </div>
                {p.pdf_pfad ? (
                  <a
                    href={p.pdf_pfad}
                    className="text-primary hover:text-primary/80 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    PDF
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">
          Bewertungen ({data.bewertungen.length})
        </h2>
        {data.bewertungen.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Keine Bewertungen.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {data.bewertungen.map((b) => (
              <li key={b.id} className="py-3 text-sm">
                <p className="font-medium text-slate-900">
                  {b.zufrieden === 1 ? (
                    <span className="text-green-600">Positiv</span>
                  ) : b.zufrieden === 0 ? (
                    <span className="text-red-600">Negativ</span>
                  ) : (
                    "Offen"
                  )}{" "}
                  · Protokoll #{b.protokoll_id ?? "–"}
                </p>
                <p className="text-slate-600">{formatDe(b.erstellt_am)}</p>
                {b.feedback_text ? (
                  <p className="mt-1 whitespace-pre-wrap text-slate-800">{b.feedback_text}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
