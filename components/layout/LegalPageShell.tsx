import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Gemeinsamer Rahmen für Impressum, Datenschutz, AGB (Landing-Stil).
 */
export function LegalPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-white/10 bg-slate-900">
        <div className="mx-auto flex h-14 min-h-[48px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="text-base font-bold tracking-tight text-white md:text-lg"
          >
            DokuHero
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium text-white/85 transition hover:text-white"
            >
              Anmelden
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
            >
              Registrieren
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="text-slate-700 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:first:mt-0 [&_li]:mt-1.5 [&_p]:mt-4 [&_p]:leading-relaxed [&_p]:first:mt-0 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
        <p className="mt-12 border-t border-slate-200 pt-8">
          <Link
            href="/"
            className="text-sm font-medium text-primary hover:text-primary/90 hover:underline"
          >
            ← Zur Startseite
          </Link>
        </p>
      </main>

      <footer className="bg-slate-900 px-4 py-10 text-slate-400 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <p className="order-2 text-center text-sm sm:order-1 sm:text-left">
            © 2026 DokuHero
          </p>
          <nav className="order-1 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm sm:order-2">
            <Link
              href="/datenschutz"
              className="inline-flex min-h-12 min-w-[48px] items-center justify-center font-medium transition active:text-white md:hover:text-white"
            >
              Datenschutz
            </Link>
            <Link
              href="/impressum"
              className="inline-flex min-h-12 min-w-[48px] items-center justify-center font-medium transition active:text-white md:hover:text-white"
            >
              Impressum
            </Link>
            <Link
              href="/agb"
              className="inline-flex min-h-12 min-w-[48px] items-center justify-center font-medium transition active:text-white md:hover:text-white"
            >
              AGB
            </Link>
            <a
              href="mailto:kontakt@dokuhero.de"
              className="inline-flex min-h-12 min-w-[48px] items-center justify-center font-medium transition active:text-white md:hover:text-white"
            >
              Kontakt
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
