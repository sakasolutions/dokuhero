"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function KundeNeuPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: FormValues) {
    setFormError(null);
    const res = await fetch("/api/kunden", {
      method: "POST",
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

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href="/kunden"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Liste
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Neuer Kunde</h1>
        <p className="text-slate-600">Pflichtfelder sind mit * markiert</p>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/kunden"
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
