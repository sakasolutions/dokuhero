"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";
import type { AuftragMitKunde, AuftragStatus } from "@/types";

const schema = z.object({
  beschreibung: z.string().optional(),
  status: z.enum(["offen", "in_bearbeitung", "abgeschlossen"]),
});

type FormValues = z.infer<typeof schema>;

const STATUS_OPTIONS: { value: AuftragStatus; label: string }[] = [
  { value: "offen", label: "Offen" },
  { value: "in_bearbeitung", label: "In Bearbeitung" },
  { value: "abgeschlossen", label: "Abgeschlossen" },
];

export default function AuftragBearbeitenPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);

  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    kunde_name: string | null;
    erstellt_am: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/auftraege/${id}`);
        if (!res.ok) {
          if (!cancelled) setFormError("Auftrag nicht gefunden.");
          return;
        }
        const a = (await res.json()) as AuftragMitKunde;
        if (!cancelled) {
          setMeta({
            kunde_name: a.kunde_name,
            erstellt_am:
              typeof a.erstellt_am === "string"
                ? a.erstellt_am
                : String(a.erstellt_am),
          });
          reset({
            beschreibung: a.beschreibung ?? "",
            status: a.status as AuftragStatus,
          });
        }
      } catch {
        if (!cancelled) setFormError("Laden fehlgeschlagen.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, reset]);

  async function onSubmit(data: FormValues) {
    setFormError(null);
    const res = await fetch(`/api/auftraege/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        beschreibung: data.beschreibung?.trim() || null,
        status: data.status,
      }),
    });

    if (!res.ok) {
      setFormError("Speichern fehlgeschlagen.");
      return;
    }

    router.push("/auftraege");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl">
        <p className="text-slate-600">Laden…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href="/auftraege"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Liste
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Auftrag bearbeiten</h1>
        {meta ? (
          <p className="mt-1 text-slate-600">
            Kunde:{" "}
            <span className="font-medium text-slate-800">
              {meta.kunde_name ?? "–"}
            </span>
          </p>
        ) : null}
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
              htmlFor="status"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Status
            </label>
            <select
              id="status"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              {...register("status")}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {errors.status?.message ? (
              <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
            ) : null}
          </div>

          <Textarea
            label="Beschreibung"
            error={errors.beschreibung?.message}
            {...register("beschreibung")}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/auftraege"
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 sm:order-first sm:w-auto"
            >
              Abbrechen
            </Link>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Speichern…" : "Speichern"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
