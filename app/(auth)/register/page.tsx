"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";

const inputClass =
  "box-border w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500";

const btnPrimary =
  "box-border w-full min-w-0 max-w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60";

const registerSchema = z
  .object({
    name: z.string().min(1, "Betriebsname ist erforderlich"),
    email: z.string().email("Ungültige E-Mail"),
    password: z.string().min(8, "Mindestens 8 Zeichen"),
    passwordConfirm: z.string(),
    acceptAgb: z.boolean(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwörter stimmen nicht überein",
    path: ["passwordConfirm"],
  })
  .refine((data) => data.acceptAgb === true, {
    message:
      "Bitte bestätigen, dass du die AGB und die Datenschutzerklärung gelesen hast und akzeptierst.",
    path: ["acceptAgb"],
  });

export default function RegisterPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      passwordConfirm: "",
      acceptAgb: false,
    },
  });

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
    <AuthSplitLayout
      desktopAuthLink={{
        href: "/login",
        preface: "Bereits ein Konto?",
        label: "Anmelden",
      }}
    >
      <div className="w-full min-w-0 max-w-full">
        <h1 className="text-2xl font-bold text-slate-900">Konto erstellen</h1>
        <p className="mt-1 text-slate-500">
          30 Tage kostenlos — keine Kreditkarte.
        </p>

        <form
          onSubmit={handleSubmit((values) => void onSubmit(values))}
          className="mt-8 min-w-0 space-y-4"
          noValidate
        >
          {formError ? (
            <p
              className="min-w-0 break-words rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          <div className="min-w-0">
            <label
              htmlFor="reg-name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Betriebsname *
            </label>
            <input
              id="reg-name"
              type="text"
              autoComplete="organization"
              className={inputClass}
              {...register("name")}
            />
            {errors.name?.message ? (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="min-w-0">
            <label
              htmlFor="reg-email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              E-Mail *
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              className={inputClass}
              placeholder="name@betrieb.de"
              {...register("email")}
            />
            {errors.email?.message ? (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="min-w-0">
            <label
              htmlFor="reg-password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Passwort *
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              className={inputClass}
              {...register("password")}
            />
            {errors.password?.message ? (
              <p className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <div className="min-w-0">
            <label
              htmlFor="reg-password-confirm"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Passwort wiederholen *
            </label>
            <input
              id="reg-password-confirm"
              type="password"
              autoComplete="new-password"
              className={inputClass}
              {...register("passwordConfirm")}
            />
            {errors.passwordConfirm?.message ? (
              <p className="mt-1 text-sm text-red-600">
                {errors.passwordConfirm.message}
              </p>
            ) : null}
          </div>

          <div className="min-w-0">
            <Controller
              name="acceptAgb"
              control={control}
              render={({ field }) => (
                <label className="flex min-w-0 cursor-pointer items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                  <span className="min-w-0 break-words">
                    Ich habe die{" "}
                    <Link
                      href="/agb"
                      className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      AGB
                    </Link>{" "}
                    und{" "}
                    <Link
                      href="/datenschutz"
                      className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Datenschutzerklärung
                    </Link>{" "}
                    gelesen und akzeptiere diese. *
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

          <button type="submit" disabled={isSubmitting} className={btnPrimary}>
            {isSubmitting ? "Wird erstellt…" : "Konto erstellen"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500 lg:hidden">
          Bereits registriert?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Anmelden
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
