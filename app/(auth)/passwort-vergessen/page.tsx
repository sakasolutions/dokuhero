"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  email: z.string().email("Ungültige E-Mail"),
});

type FormValues = z.infer<typeof schema>;

export default function PasswortVergessenPage() {
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: FormValues) {
    setFormError(null);
    const res = await fetch("/api/auth/passwort-vergessen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email.trim() }),
    });

    const json = (await res.json()) as { error?: string; message?: string };

    if (!res.ok) {
      setFormError(json.error ?? "Anfrage fehlgeschlagen.");
      return;
    }

    setDone(true);
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-dark">DokuHero</h1>
        <p className="mt-2 text-sm text-slate-600">Passwort vergessen</p>
      </div>
      <Card>
        {done ? (
          <p
            className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-dark"
            role="status"
          >
            Wenn ein Konto mit dieser E-Mail existiert, erhältst du gleich einen
            Link zum Zurücksetzen.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {formError ? (
              <p
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
              >
                {formError}
              </p>
            ) : null}
            <Input
              label="E-Mail"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <Button
              type="submit"
              className="w-full min-h-11"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Wird gesendet…" : "Link senden"}
            </Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-slate-600">
          <Link href="/login" className="font-medium text-primary hover:text-primary/80 hover:underline">
            Zurück zum Login
          </Link>
        </p>
      </Card>
    </div>
  );
}
