"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

const inputClass =
  "w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500";

const btnPrimary =
  "w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const reset = searchParams.get("reset");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (registered === "1" || reset === "1") {
      const t = setTimeout(() => {
        router.replace("/login");
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [registered, reset, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("E-Mail oder Passwort ist falsch.");
        setLoading(false);
        return;
      }
      router.push("/auftraege");
      router.refresh();
    } catch {
      setError("Anmeldung fehlgeschlagen.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {registered === "1" && (
        <div
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          Registrierung erfolgreich. Du kannst dich jetzt anmelden.
        </div>
      )}
      {reset === "1" && (
        <div
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          Passwort wurde geändert. Du kannst dich jetzt anmelden.
        </div>
      )}

      <h1 className="text-2xl font-bold text-slate-900">Willkommen zurück</h1>
      <p className="mt-1 text-slate-500">Meld dich in deinem Konto an.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">
            E-Mail
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="name@betrieb.de"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label htmlFor="login-password" className="text-sm font-medium text-slate-700">
              Passwort
            </label>
            <Link
              href="/passwort-vergessen"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              Passwort vergessen?
            </Link>
          </div>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className={btnPrimary}>
          {loading ? "Wird angemeldet…" : "Anmelden"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-500 lg:hidden">
        Noch kein Konto?{" "}
        <Link href="/register" className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
          Registrieren
        </Link>
      </p>
    </div>
  );
}

export function LoginForm() {
  return (
    <Suspense
      fallback={
        <div className="w-full space-y-4 animate-pulse">
          <div className="h-8 w-48 rounded bg-slate-200" />
          <div className="h-4 w-full rounded bg-slate-200" />
          <div className="h-12 w-full rounded-xl bg-slate-200" />
          <div className="h-12 w-full rounded-xl bg-slate-200" />
        </div>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}
