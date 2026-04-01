"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { FotoUpload } from "@/components/protokoll/FotoUpload";
import { SprachEingabe } from "@/components/protokoll/SprachEingabe";
import type { AuftragMitKunde } from "@/types";

const STEPS = 3;

export default function ProtokollNeuPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [auftraege, setAuftraege] = useState<AuftragMitKunde[]>([]);
  const [loadingAuftraege, setLoadingAuftraege] = useState(true);
  const [auftragId, setAuftragId] = useState<number | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const [notiz, setNotiz] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auftraege/offen");
        if (!res.ok) throw new Error("load");
        const data = (await res.json()) as AuftragMitKunde[];
        if (!cancelled) setAuftraege(data);
      } catch {
        if (!cancelled) setError("Aufträge konnten nicht geladen werden.");
      } finally {
        if (!cancelled) setLoadingAuftraege(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function canGoStep2() {
    return auftragId != null;
  }

  function canSubmit() {
    return auftragId != null;
  }

  async function handleSubmit() {
    if (!auftragId) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/protokoll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auftrag_id: auftragId,
          notiz: notiz.trim() || null,
          fotos,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof j.error === "string" ? j.error : "Speichern fehlgeschlagen."
        );
        return;
      }
      router.push("/auftraege");
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto min-h-[70vh] max-w-lg pb-6">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg text-primary hover:bg-slate-100"
          aria-label="Zurück"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Protokoll</h1>
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {Array.from({ length: STEPS }, (_, i) => i + 1).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
                step === s
                  ? "bg-primary text-white ring-2 ring-primary ring-offset-2"
                  : step > s
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 text-slate-600"
              }`}
            >
              {step > s ? <Check className="h-6 w-6" /> : s}
            </div>
            {s < STEPS ? (
              <div
                className={`h-1 w-8 rounded-full ${step > s ? "bg-emerald-400" : "bg-slate-200"}`}
              />
            ) : null}
          </div>
        ))}
      </div>
      <p className="mb-6 text-center text-sm font-medium text-slate-600">
        Schritt {step} von {STEPS}
        {step === 1
          ? " · Auftrag wählen"
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
              Offenen Auftrag wählen
            </h2>
            {loadingAuftraege ? (
              <p className="text-slate-600">Laden…</p>
            ) : auftraege.length === 0 ? (
              <p className="text-slate-600">
                Keine offenen Aufträge. Lege zuerst unter Aufträge einen
                offenen Auftrag an.
              </p>
            ) : (
              <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                {auftraege.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAuftragId(a.id)}
                    className={`flex min-h-14 w-full flex-col items-start rounded-xl border-2 px-4 py-3 text-left transition ${
                      auftragId === a.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="font-semibold text-slate-900">
                      {a.kunde_name ?? "Unbekannt"}
                    </span>
                    {a.beschreibung ? (
                      <span className="mt-0.5 line-clamp-2 text-sm text-slate-600">
                        {a.beschreibung}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
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
