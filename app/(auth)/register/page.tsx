"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const registerSchema = z
  .object({
    name: z.string().min(1, "Betriebsname ist erforderlich"),
    email: z.string().email("Ungültige E-Mail"),
    password: z.string().min(8, "Mindestens 8 Zeichen"),
    passwordConfirm: z.string(),
    telefon: z.string().optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwörter stimmen nicht überein",
    path: ["passwordConfirm"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterForm) {
    setFormError(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
        passwordConfirm: data.passwordConfirm,
        telefon: data.telefon || null,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        typeof json.error === "string"
          ? json.error
          : "Registrierung fehlgeschlagen.";
      setFormError(msg);
      return;
    }

    const sign = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (sign?.error) {
      setFormError(
        "Konto erstellt, aber Anmeldung fehlgeschlagen. Bitte auf der Login-Seite anmelden."
      );
      router.push("/login");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-primary">DokuHero</h1>
        <p className="mt-2 text-sm text-slate-600">Betrieb registrieren</p>
      </div>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          ) : null}
          <Input
            label="Betriebsname"
            autoComplete="organization"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="E-Mail"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Telefon"
            type="tel"
            autoComplete="tel"
            error={errors.telefon?.message}
            {...register("telefon")}
          />
          <Input
            label="Passwort"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <Input
            label="Passwort wiederholen"
            type="password"
            autoComplete="new-password"
            error={errors.passwordConfirm?.message}
            {...register("passwordConfirm")}
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Wird gespeichert…" : "Registrieren"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Bereits registriert?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Zum Login
          </Link>
        </p>
      </Card>
    </div>
  );
}
