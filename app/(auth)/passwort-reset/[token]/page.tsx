"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const schema = z
  .object({
    password: z.string().min(8, "Mindestens 8 Zeichen"),
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Passwörter stimmen nicht überein",
    path: ["passwordConfirm"],
  });

type FormValues = z.infer<typeof schema>;

export default function PasswortResetTokenPage() {
  const router = useRouter();
  const params = useParams();
  const token = String(params.token ?? "");

  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", passwordConfirm: "" },
  });

  async function onSubmit(data: FormValues) {
    setFormError(null);
    const res = await fetch("/api/auth/passwort-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: data.password }),
    });

    const json = (await res.json()) as { error?: string; success?: boolean };

    if (!res.ok) {
      setFormError(json.error ?? "Zurücksetzen fehlgeschlagen.");
      return;
    }

    if (json.success) {
      router.push("/login?reset=1");
      router.refresh();
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-md text-center text-sm text-slate-600">
        Ungültiger Link.
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-primary">DokuHero</h1>
        <p className="mt-2 text-sm text-slate-600">Neues Passwort setzen</p>
      </div>
      <Card>
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
            label="Neues Passwort"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <Input
            label="Passwort bestätigen"
            type="password"
            autoComplete="new-password"
            error={errors.passwordConfirm?.message}
            {...register("passwordConfirm")}
          />
          <Button
            type="submit"
            className="w-full min-h-11"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Speichern…" : "Passwort speichern"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Zum Login
          </Link>
        </p>
      </Card>
    </div>
  );
}
