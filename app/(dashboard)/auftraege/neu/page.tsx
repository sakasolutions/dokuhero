"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Kunde } from "@/types";

const schema = z.object({
  kunde_id: z.string().min(1, "Bitte einen Kunden wählen"),
});

type FormValues = z.infer<typeof schema>;

export default function AuftragNeuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preKundeId = searchParams.get("kunde_id")?.trim() ?? "";
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [loadingKunden, setLoadingKunden] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kunde_id: preKundeId,
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/kunden");
        if (!res.ok) throw new Error("load");
        const data = (await res.json()) as Kunde[];
        if (!cancelled) setKunden(data);
      } catch {
        if (!cancelled) setFormError("Kunden konnten nicht geladen werden.");
      } finally {
        if (!cancelled) setLoadingKunden(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!preKundeId || kunden.length === 0) return;
    if (kunden.some((k) => String(k.id) === preKundeId)) {
      setValue("kunde_id", preKundeId);
    }
  }, [preKundeId, kunden, setValue]);

  async function onSubmit(data: FormValues) {
    setFormError(null);
    const res = await fetch("/api/auftraege", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kunde_id: Number(data.kunde_id),
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setFormError(
        typeof j.error === "string" ? j.error : "Speichern fehlgeschlagen."
      );
      return;
    }

    router.push("/auftraege");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href="/auftraege"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Liste
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Neuer Auftrag</h1>
        <p className="text-slate-600">Wähle den Kunden für den neuen Auftrag.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          ) : null}

          <div className="w-full">
            <label
              htmlFor="kunde_id"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Kunde *
            </label>
            <select
              id="kunde_id"
              disabled={loadingKunden || kunden.length === 0}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              {...register("kunde_id")}
            >
              <option value="">
                {loadingKunden
                  ? "Laden…"
                  : kunden.length === 0
                    ? "Keine Kunden vorhanden"
                    : "Kunde wählen…"}
              </option>
              {kunden.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                  {k.kennzeichen ? ` (${k.kennzeichen})` : ""}
                </option>
              ))}
            </select>
            {errors.kunde_id?.message ? (
              <p className="mt-1 text-sm text-red-600">
                {errors.kunde_id.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/auftraege"
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 sm:order-first sm:w-auto"
            >
              Abbrechen
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting || kunden.length === 0}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? "Speichern…" : "Auftrag anlegen"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
