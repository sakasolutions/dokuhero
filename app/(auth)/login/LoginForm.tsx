"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const loginSchema = z.object({
  email: z.string().email("Ungültige E-Mail"),
  password: z.string().min(1, "Passwort erforderlich"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "1";

  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormValues) {
    setFormError(null);
    const res = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (res?.error) {
      setFormError("E-Mail oder Passwort ist falsch.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-primary">DokuHero</h1>
        <p className="mt-2 text-sm text-slate-600">Anmelden</p>
      </div>
      <Card>
        {registered ? (
          <p
            className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            role="status"
          >
            Konto erstellt! Bitte einloggen.
          </p>
        ) : null}
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
          <Input
            label="Passwort"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <Button
            type="submit"
            className="w-full min-h-11"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Wird angemeldet…" : "Anmelden"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Noch kein Konto?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Registrieren
          </Link>
        </p>
      </Card>
    </div>
  );
}
