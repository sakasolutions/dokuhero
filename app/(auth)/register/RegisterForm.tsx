"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const inputClass =
  "w-full rounded-xl border-2 px-4 py-3 shadow-sm focus:outline-none focus:ring-2 " +
  "border-white/40 bg-white/[0.18] text-white placeholder:text-slate-300 focus:border-blue-400 focus:ring-blue-400 " +
  "lg:border lg:border-slate-200 lg:bg-white lg:text-slate-900 lg:placeholder:text-slate-400 lg:shadow-none lg:focus:border-slate-200 lg:focus:ring-blue-500";

const btnPrimary =
  "w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60";

const labelClass =
  "mb-1.5 block text-sm font-medium text-white lg:text-slate-700";

const linkOnDark =
  "font-medium text-sky-300 hover:text-white hover:underline lg:text-blue-600 lg:hover:text-blue-700";

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

const fieldErrorClass = "mt-1 text-sm text-red-300 lg:text-red-600";

export function RegisterForm() {
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

  const formErrorBox =
    "rounded-xl border px-4 py-3 text-sm " +
    "border-red-400/40 bg-red-500/10 text-red-100 " +
    "lg:border-red-200 lg:bg-red-50 lg:text-red-700";

  return (
    <div className="w-full min-w-0">
      <h1 className="text-2xl font-bold text-white lg:text-slate-900">
        Konto erstellen
      </h1>
      <p className="mt-1 text-blue-100/90 lg:text-slate-500">
        30 Tage kostenlos — keine Kreditkarte.
      </p>

      <form
        onSubmit={handleSubmit((values) => void onSubmit(values))}
        className="mt-6 space-y-4"
        noValidate
      >
        {formError ? (
          <p className={formErrorBox} role="alert">
            {formError}
          </p>
        ) : null}

        <div>
          <label htmlFor="reg-name" className={labelClass}>
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
            <p className={fieldErrorClass}>{errors.name.message}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="reg-email" className={labelClass}>
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
            <p className={fieldErrorClass}>{errors.email.message}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="reg-password" className={labelClass}>
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
            <p className={fieldErrorClass}>{errors.password.message}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="reg-password-confirm" className={labelClass}>
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
            <p className={fieldErrorClass}>{errors.passwordConfirm.message}</p>
          ) : null}
        </div>

        <div>
          <Controller
            name="acceptAgb"
            control={control}
            render={({ field }) => (
              <label className="flex cursor-pointer items-start gap-3 text-sm text-white lg:text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 rounded border-2 border-white/50 bg-white/10 text-blue-500 focus:ring-blue-400 lg:border lg:border-slate-300 lg:bg-white lg:focus:ring-blue-500"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
                <span className="min-w-0 break-words">
                  Ich habe die{" "}
                  <Link
                    href="/agb"
                    className={linkOnDark}
                    target="_blank"
                    rel="noreferrer"
                  >
                    AGB
                  </Link>{" "}
                  und{" "}
                  <Link
                    href="/datenschutz"
                    className={linkOnDark}
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
            <p className={fieldErrorClass}>{errors.acceptAgb.message}</p>
          ) : null}
        </div>

        <button type="submit" disabled={isSubmitting} className={btnPrimary}>
          {isSubmitting ? "Wird erstellt…" : "Konto erstellen"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-blue-100/90 lg:text-slate-500">
        Bereits ein Konto?{" "}
        <Link href="/login" className={linkOnDark}>
          Anmelden
        </Link>
      </p>
    </div>
  );
}
