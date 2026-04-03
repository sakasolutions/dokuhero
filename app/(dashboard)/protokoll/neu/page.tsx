"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { FotoUpload } from "@/components/protokoll/FotoUpload";
import { SprachEingabe } from "@/components/protokoll/SprachEingabe";

type KundeOption = { id: number; name: string };

const STEPS = 3;

type LimitPayload = {
  limitReached: boolean;
  count: number;
  limit: number;
};

export default function ProtokollNeuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const preKundeIdRaw = searchParams.get("kunde_id");
  const isInhaber = session?.user?.rolle === "inhaber";

  const [step, setStep] = useState(1);
  const [kunden, setKunden] = useState<KundeOption[]>([]);
  const [loadingKunden, setLoadingKunden] = useState(true);
  const [kundeIdSelected, setKundeIdSelected] = useState<number | null>(null);
  const [neuerKundeName, setNeuerKundeName] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [notiz, setNotiz] = useState("");
  const [materialien, setMaterialien] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [limitPhase, setLimitPhase] = useState<"loading" | "ready">("loading");
  const [limitBlocked, setLimitBlocked] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ count: number; limit: number } | null>(
    null
  );

  const zurueckHref = isInhaber ? "/dashboard" : "/protokolle";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/protokoll/limit");
        const j = (await res.json().catch(() => ({}))) as Partial<LimitPayload> & {
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setLimitPhase("ready");
          setLimitBlocked(false);
          return;
        }
        if (j.limitReached === true && typeof j.limit === "number") {
          setLimitInfo({
            count: typeof j.count === "number" ? j.count : j.limit,
            limit: j.limit,
          });
          setLimitBlocked(true);
        } else {
          setLimitBlocked(false);
        }
      } catch {
        if (!cancelled) setLimitBlocked(false);
      } finally {
        if (!cancelled) setLimitPhase("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (limitPhase !== "ready" || limitBlocked) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/kunden");
        if (!res.ok) throw new Error("load");
        const data = (await res.json()) as KundeOption[];
        if (!cancelled) setKunden(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setError("Kunden konnten nicht geladen werden.");
      } finally {
        if (!cancelled) setLoadingKunden(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limitPhase, limitBlocked]);

  useEffect(() => {
    if (!preKundeIdRaw || kunden.length === 0) return;
    const n = Number(preKundeIdRaw);
    if (!Number.isFinite(n)) return;
    if (kunden.some((k) => k.id === n)) {
      setKundeIdSelected(n);
      setNeuerKundeName("");
    }
  }, [preKundeIdRaw, kunden]);

  function canGoStep2() {
    const neu = neuerKundeName.trim();
    return kundeIdSelected != null || neu.length > 0;
  }

  function canSubmit() {
    return canGoStep2();
  }

  async function refreshLimitAndBlock() {
    try {
      const res = await fetch("/api/protokoll/limit");
      const j = (await res.json()) as Partial<LimitPayload>;
      if (res.ok && j.limitReached === true && typeof j.limit === "number") {
        setLimitInfo({
          count: typeof j.count === "number" ? j.count : j.limit,
          limit: j.limit,
        });
        setLimitBlocked(true);
      }
    } catch {
      /* ignore */
    }
  }

  async function resolveKundeId(): Promise<number> {
    const neu = neuerKundeName.trim();
    if (neu) {
      const res = await fetch("/api/kunden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: neu }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        id?: number;
        error?: unknown;
      };
      if (!res.ok || typeof j.id !== "number") {
        const msg =
          typeof j.error === "object" && j.error != null && "name" in j.error
            ? String((j.error as { name?: string[] }).name?.[0])
            : "Kunde konnte nicht angelegt werden.";
        throw new Error(msg);
      }
      return j.id;
    }
    if (kundeIdSelected != null) return kundeIdSelected;
    throw new Error("Bitte einen Kunden wählen oder einen Namen eingeben.");
  }

  async function handleSubmit() {
    if (!canSubmit()) return;
    setError(null);
    setSubmitting(true);
    try {
      const kundeId = await resolveKundeId();
      const resAuf = await fetch("/api/auftraege", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kunde_id: kundeId }),
      });
      const jAuf = (await resAuf.json().catch(() => ({}))) as {
        id?: number;
        error?: unknown;
      };
      if (!resAuf.ok || typeof jAuf.id !== "number") {
        setError(
          typeof jAuf.error === "string"
            ? jAuf.error
            : "Auftrag konnte nicht erstellt werden."
        );
        return;
      }

      const res = await fetch("/api/protokoll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auftrag_id: jAuf.id,
          notiz: notiz.trim() || null,
          materialien: materialien.trim() || null,
          fotos,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        limitReached?: boolean;
      };
      if (!res.ok) {
        if (res.status === 403 && j.limitReached === true) {
          await refreshLimitAndBlock();
          return;
        }
        setError(
          typeof j.error === "string" ? j.error : "Speichern fehlgeschlagen."
        );
        return;
      }
      router.push("/protokolle");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Netzwerkfehler.");
    } finally {
      setSubmitting(false);
    }
  }

  if (limitPhase === "loading" || sessionStatus === "loading") {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg items-center justify-center pb-6">
        <p className="text-slate-600">Laden…</p>
      </div>
    );
  }

  if (limitBlocked && limitInfo) {
    const { limit } = limitInfo;
    return (
      <div className="mx-auto max-w-xl pb-8">
        <Card className="border-amber-200 bg-amber-50/80 p-8 shadow-md sm:p-10">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Monatliches Limit erreicht
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-700 sm:text-lg">
            Ihr Betrieb hat diesen Monat bereits {limit}{" "}
            {limit === 1 ? "Protokoll" : "Protokolle"} erstellt.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-700 sm:text-lg">
            Bitte wenden Sie sich an den Betriebsinhaber für ein Upgrade.
          </p>
          <div className="mt-10">
            <Button
              type="button"
              className="min-h-12 w-full text-base sm:w-auto"
              onClick={() => router.push(zurueckHref)}
            >
              {isInhaber ? "Zurück zum Dashboard" : "Zu meinen Protokollen"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[70vh] max-w-lg pb-6">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={zurueckHref}
          className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg text-primary hover:bg-surface"
          aria-label="Zurück"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Protokoll</h1>
      </div>

      <div className="mb-6 flex items-center justify-center gap-2">
        {Array.from({ length: STEPS }, (_, i) => i + 1).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
                step === s
                  ? "bg-primary text-white ring-2 ring-primary ring-offset-2"
                  : step > s
                    ? "bg-primary text-white"
                    : "bg-slate-200 text-slate-600"
              }`}
            >
              {step > s ? <Check className="h-6 w-6" /> : s}
            </div>
            {s < STEPS ? (
              <div
                className={`h-1 w-8 rounded-full ${step > s ? "bg-primary/60" : "bg-slate-200"}`}
              />
            ) : null}
          </div>
        ))}
      </div>
      <p className="mb-6 text-center text-sm font-medium text-slate-600">
        Schritt {step} von {STEPS}
        {step === 1
          ? " · Kunde wählen"
          : step === 2
            ? " · Fotos"
            : " · Notiz"}
      </p>

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <Card className="border-slate-200 shadow-md">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Kunde wählen *
            </h2>
            {loadingKunden ? (
              <p className="text-slate-600">Laden…</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="kunde-select"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Bestehender Kunde
                  </label>
                  <select
                    id="kunde-select"
                    className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={kundeIdSelected ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setKundeIdSelected(v === "" ? null : Number(v));
                      if (v !== "") setNeuerKundeName("");
                    }}
                  >
                    <option value="">Aus Liste wählen…</option>
                    {kunden.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="kunde-neu"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Neuer Kunde — Name eingeben
                  </label>
                  <input
                    id="kunde-neu"
                    type="text"
                    autoComplete="organization"
                    placeholder="z. B. Müller GmbH"
                    className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={neuerKundeName}
                    onChange={(e) => {
                      setNeuerKundeName(e.target.value);
                      if (e.target.value.trim()) setKundeIdSelected(null);
                    }}
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-slate-500">
              Entweder einen bestehenden Kunden auswählen oder einen neuen Namen
              eintragen — der Auftrag wird im Hintergrund automatisch angelegt.
            </p>
            <Button
              type="button"
              className="min-h-12 w-full text-base"
              disabled={!canGoStep2()}
              onClick={() => setStep(2)}
            >
              Weiter
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Fotos</h2>
            <FotoUpload value={fotos} onChange={setFotos} maxPhotos={10} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 flex-1 text-base"
                onClick={() => setStep(1)}
              >
                Zurück
              </Button>
              <Button
                type="button"
                className="min-h-12 flex-1 text-base"
                onClick={() => setStep(3)}
              >
                Weiter
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Notiz</h2>
            <p className="text-sm text-slate-600">
              Tippe oder sprich deine Notiz…
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <Textarea
                  id="protokoll-notiz"
                  label="Beschreibung / Befunde"
                  placeholder="Was wurde gemacht? Befunde, Maßnahmen …"
                  value={notiz}
                  onChange={(e) => setNotiz(e.target.value)}
                  rows={10}
                  className="min-h-[220px] text-base"
                />
              </div>
              <SprachEingabe
                onTranscript={(t) =>
                  setNotiz((n) => {
                    const cur = n.trim();
                    return cur ? `${cur} ${t}` : t;
                  })
                }
              />
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Materialien / Positionen
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <Textarea
                    id="protokoll-materialien"
                    aria-label="Materialien / Positionen"
                    placeholder="Materialien, Ersatzteile, Positionen..."
                    value={materialien}
                    onChange={(e) => setMaterialien(e.target.value)}
                    rows={3}
                    className="min-h-[4.5rem] text-base"
                  />
                </div>
                <SprachEingabe
                  onTranscript={(t) => {
                    setMaterialien((prev) => {
                      const p = prev.trim();
                      return p === "" ? t : `${p}, ${t}`;
                    });
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 flex-1 text-base"
                onClick={() => setStep(2)}
              >
                Zurück
              </Button>
              <Button
                type="button"
                className="min-h-12 flex-1 text-base"
                disabled={!canSubmit() || submitting}
                onClick={() => void handleSubmit()}
              >
                {submitting ? "Wird gespeichert…" : "Absenden"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
