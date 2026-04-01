import Link from "next/link";
import {
  Camera,
  FileText,
  Send,
  Star,
  Users,
  Wrench,
} from "lucide-react";

const steps = [
  {
    n: 1,
    icon: Camera,
    title: "Foto machen + Notiz sprechen",
  },
  {
    n: 2,
    icon: FileText,
    title: "KI erstellt professionellen Text",
  },
  {
    n: 3,
    icon: Send,
    title: "PDF geht automatisch an den Kunden",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface text-slate-700">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-dark"
          >
            DokuHero
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:text-primary/80"
            >
              Anmelden
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
            >
              Registrieren
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b border-slate-200/60 px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-dark sm:text-5xl md:text-6xl">
              Protokolle in 60 Sekunden.
              <span className="block text-primary">Automatisch.</span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
              Foto machen, kurz sprechen — DokuHero erstellt das professionelle PDF
              und schickt es direkt an deinen Kunden.
            </p>
            <div className="mt-12 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Link
                href="/register"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-10 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary/90"
              >
                Kostenlos testen
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-10 py-3.5 text-base font-semibold text-dark transition hover:border-slate-300 hover:bg-surface"
              >
                Anmelden
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-dark sm:text-4xl">
              So funktioniert&apos;s
            </h2>
            <ol className="mx-auto mt-14 grid max-w-5xl gap-8 sm:grid-cols-3">
              {steps.map(({ n, icon: Icon, title }) => (
                <li
                  key={n}
                  className="relative rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm"
                >
                  <div className="absolute -top-3 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-accent text-sm font-bold text-dark shadow-sm">
                    {n}
                  </div>
                  <div
                    className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/25 text-primary"
                    aria-hidden
                  >
                    <Icon className="h-7 w-7" strokeWidth={2} />
                  </div>
                  <p className="mt-5 font-semibold text-dark">{title}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-y border-slate-200/60 bg-white/60 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-dark sm:text-4xl">
              Funktionen
            </h2>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Camera,
                  title: "Auftragsprotokoll mit Fotos",
                  text: "Alles dokumentieren, was vor Ort passiert — klar und nachvollziehbar.",
                },
                {
                  icon: FileText,
                  title: "KI-Protokolltext auf Knopfdruck",
                  text: "Aus Stichworten und Sprache wird ein sauberer Protokolltext.",
                },
                {
                  icon: Send,
                  title: "Automatischer PDF-Versand per Mail",
                  text: "Dein Kunde erhält das PDF direkt — ohne Extra-Aufwand.",
                },
                {
                  icon: Star,
                  title: "Bewertungs-Automatik nach 2 Stunden",
                  text: "Zufriedenheits-Feedback kommt von selbst — du bleibst informiert.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-200/80 bg-surface p-6 shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/30 text-primary">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h3 className="mt-4 font-semibold text-dark">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-dark sm:text-4xl">
              Für wen
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
              Gebaut für Betriebe, die vor Ort arbeiten und wenig Zeit für Bürokratie
              haben.
            </p>
            <ul className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2">
              {[
                {
                  icon: Camera,
                  title: "KFZ-Werkstätten",
                  text: "Service und Reparatur sauber dokumentieren — inklusive Fotos vom Fahrzeug.",
                },
                {
                  icon: Users,
                  title: "Hausmeisterdienste",
                  text: "Objekte und Arbeiten festhalten, ohne lange am Schreibtisch zu sitzen.",
                },
                {
                  icon: Wrench,
                  title: "Handwerker",
                  text: "Ob Elektrik, Sanitär oder Tischler: Protokoll und Kunde sind schnell bedient.",
                },
                {
                  icon: Star,
                  title: "Reinigungsfirmen",
                  text: "Einsätze und Leistungen klar belegen — professionell fürs Büro des Kunden.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <li
                  key={title}
                  className="flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/30 text-primary">
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-slate-200/60 bg-white/60 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-dark sm:text-4xl">
              Preise
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-slate-600">
              Einfache Pakete — du entscheidest, wie viel du protokollierst.
            </p>
            <div className="mx-auto mt-14 grid max-w-3xl gap-8 lg:grid-cols-2">
              <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-surface p-8 shadow-sm">
                <h3 className="text-lg font-bold text-dark">Starter</h3>
                <p className="mt-3 text-3xl font-extrabold text-primary">
                  29€
                  <span className="text-base font-semibold text-slate-500">
                    /Monat
                  </span>
                </p>
                <p className="mt-4 text-slate-600">Bis 50 Protokolle</p>
                <Link
                  href="/register"
                  className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-primary/90"
                >
                  Kostenlos testen
                </Link>
              </div>
              <div className="relative flex flex-col rounded-2xl border-2 border-primary bg-white p-8 shadow-lg shadow-primary/10">
                <span className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white">
                  Beliebt
                </span>
                <h3 className="text-lg font-bold text-dark">Pro</h3>
                <p className="mt-3 text-3xl font-extrabold text-primary">
                  59€
                  <span className="text-base font-semibold text-slate-500">
                    /Monat
                  </span>
                </p>
                <p className="mt-4 text-slate-600">Unbegrenzt Protokolle</p>
                <Link
                  href="/register"
                  className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-primary/90"
                >
                  Kostenlos testen
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-surface px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <p className="text-sm text-slate-600">© 2026 DokuHero</p>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link
              href="/datenschutz"
              className="font-semibold text-primary hover:text-primary/80"
            >
              Datenschutz
            </Link>
            <Link
              href="/impressum"
              className="font-semibold text-primary hover:text-primary/80"
            >
              Impressum
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
