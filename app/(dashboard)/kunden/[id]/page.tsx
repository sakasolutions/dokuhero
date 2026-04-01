"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";

const schema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  email: z.union([z.string().email("Ungültige E-Mail"), z.literal("")]),
  telefon: z.string().optional(),
  adresse: z.string().optional(),
  fahrzeug: z.string().optional(),
  kennzeichen: z.string().optional(),
  notizen: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function KundeBearbeitenPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);

  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        const res = await fetch(`/api/kunden/${id}`);
        if (!res.ok) {
          if (!cancelled) setFormError("Kunde nicht gefunden.");
          return;
        }
        const k = await res.json();
        if (!cancelled) {
          reset({
            name: k.name ?? "",
            email: k.email ?? "",
            telefon: k.telefon ?? "",
            adresse: k.adresse ?? "",
            fahrzeug: k.fahrzeug ?? "",
            kennzeichen: k.kennzeichen ?? "",
            notizen: k.notizen ?? "",
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
    const res = await fetch(`/api/kunden/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email || "",
        telefon: data.telefon || null,
        adresse: data.adresse || null,
        fahrzeug: data.fahrzeug || null,
        kennzeichen: data.kennzeichen || null,
        notizen: data.notizen || null,
      }),
    });

    if (!res.ok) {
      setFormError("Speichern fehlgeschlagen.");
      return;
    }

    router.push("/kunden");
    router.refresh();
  }

  async function handleDelete() {
    if (
      !window.confirm(
        "Diesen Kunden endgültig löschen? Dies kann fehlschlagen, wenn noch Aufträge existieren."
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/kunden/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(
          typeof json.error === "string" ? json.error : "Löschen fehlgeschlagen."
        );
        return;
      }
      router.push("/kunden");
      router.refresh();
    } finally {
      setDeleting(false);
    }
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
        href="/kunden"
        className="inline-flex items-center gap-2 text-sm font-medium text-amber-500 hover:text-amber-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Liste
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Kunde bearbeiten</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          ) : null}
          <Input
            label="Name *"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="E-Mail"
            type="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Telefon"
            type="tel"
            error={errors.telefon?.message}
            {...register("telefon")}
          />
          <Input
            label="Adresse"
            error={errors.adresse?.message}
            {...register("adresse")}
          />
          <Input
            label="Fahrzeug"
            error={errors.fahrzeug?.message}
            {...register("fahrzeug")}
          />
          <Input
            label="Kennzeichen"
            error={errors.kennzeichen?.message}
            {...register("kennzeichen")}
          />
          <Textarea label="Notizen" error={errors.notizen?.message} {...register("notizen")} />
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="danger"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Wird gelöscht…" : "Kunde löschen"}
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/kunden"
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 sm:w-auto"
              >
                Abbrechen
              </Link>
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? "Speichern…" : "Speichern"}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
