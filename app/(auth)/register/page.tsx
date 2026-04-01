"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const BRANCHEN = [
  "KFZ-Werkstatt",
  "Hausmeisterdienst",
  "Handwerker",
  "Reinigung",
  "Sonstiges",
] as const;

const registerSchema = z
  .object({
    name: z.string().min(1, "Betriebsname ist erforderlich"),
    email: z.string().email("Ungültige E-Mail"),
    password: z.string().min(8, "Mindestens 8 Zeichen"),
    passwordConfirm: z.string(),
    telefon: z.string().optional(),
    branche: z
      .string()
      .refine(
        (v): v is (typeof BRANCHEN)[number] =>
          (BRANCHEN as readonly string[]).includes(v),
        { message: "Bitte eine Branche wählen." }
      ),
    acceptAgb: z.boolean(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwörter stimmen nicht überein",
    path: ["passwordConfirm"],
  })
  .refine((data) => data.acceptAgb === true, {
    message: "Bitte die AGB akzeptieren.",
    path: ["acceptAgb"],
  });

function passwordStrengthScore(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (/[a-z]/.test(pw)) s += 1;
  if (/[A-Z]/.test(pw)) s += 1;
  if (/[0-9]/.test(pw) || /[^a-zA-Z0-9]/.test(pw)) s += 1;
  return Math.min(4, s);
}

const strengthLabels = ["", "Schwach", "Okay", "Gut", "Stark"];

export default function RegisterPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      passwordConfirm: "",
      telefon: "",
      acceptAgb: false,
      branche: "",
    },
  });

  const pwd = watch("password") ?? "";
  const strength = useMemo(() => passwordStrengthScore(pwd), [pwd]);

  async function onSubmit(data: z.infer<typeof registerSchema>) {
    setFormError(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
        passwordConfirm: data.passwordConfirm,
        telefon: data.telefon?.trim() || null,
        branche: data.branche,
        acceptAgb: data.acceptAgb,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = json.error;
      if (typeof err === "string") {
        setFormError(err);
      } else if (err && typeof err === "object") {
        const first = Object.values(err).flat()[0];
        setFormError(
          typeof first === "string" ? first : "Registrierung fehlgeschlagen."
        );
      } else {
        setFormError("Registrierung fehlgeschlagen.");
      }
      return;
    }

    router.push("/login?registered=1");
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-dark">DokuHero</h1>
        <p className="mt-2 text-sm text-slate-600">Neuen Betrieb registrieren</p>
      </div>
      <Card>
        <form
          onSubmit={handleSubmit((values) =>
            void onSubmit(values as z.infer<typeof registerSchema>)
          )}
          className="space-y-4"
          noValidate
        >
          {formError ? (
            <p
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          <Input
            label="Betriebsname *"
            autoComplete="organization"
            required
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="E-Mail *"
            type="email"
            autoComplete="email"
            required
            error={errors.email?.message}
            {...register("email")}
          />

          <div>
            <Input
              label="Passwort *"
              type="password"
              autoComplete="new-password"
              required
              error={errors.password?.message}
              {...register("password")}
            />
            {pwd.length > 0 ? (
              <div className="mt-2">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Passwort-Stärke</span>
                  <span className="font-medium text-slate-700">
                    {strengthLabels[strength]}
                  </span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i <= strength
                          ? strength <= 1
                            ? "bg-red-400"
                            : strength === 2
                              ? "bg-primary/45"
                              : strength === 3
                                ? "bg-primary/75"
                                : "bg-primary"
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <Input
            label="Passwort wiederholen *"
            type="password"
            autoComplete="new-password"
            required
            error={errors.passwordConfirm?.message}
            {...register("passwordConfirm")}
          />

          <Input
            label="Telefon"
            type="tel"
            autoComplete="tel"
            error={errors.telefon?.message}
            {...register("telefon")}
          />

          <div>
            <label
              htmlFor="branche"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Branche *
            </label>
            <select
              id="branche"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              {...register("branche")}
            >
              <option value="" disabled>
                Bitte wählen…
              </option>
              {BRANCHEN.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {errors.branche?.message ? (
              <p className="mt-1 text-sm text-red-600">{errors.branche.message}</p>
            ) : null}
          </div>

          <div>
            <Controller
              name="acceptAgb"
              control={control}
              render={({ field }) => (
                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                  <span>
                    Ich akzeptiere die{" "}
                    <Link
                      href="/agb"
                      className="font-medium text-primary hover:text-primary/80 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      AGB
                    </Link>{" "}
                    *
                  </span>
                </label>
              )}
            />
            {errors.acceptAgb?.message ? (
              <p className="mt-1 text-sm text-red-600">
                {errors.acceptAgb.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="w-full min-h-11" disabled={isSubmitting}>
            {isSubmitting ? "Wird registriert…" : "Konto erstellen"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Bereits registriert?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:text-primary/80 hover:underline"
          >
            Zum Login
          </Link>
        </p>
      </Card>
    </div>
  );
}
