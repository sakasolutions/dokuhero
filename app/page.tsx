"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Camera,
  Check,
  ChevronDown,
  ClipboardList,
  HardHat,
  Mail,
  Menu,
  Mic,
  Send,
  Sparkles,
  Star,
  Wrench,
  X,
} from "lucide-react";

const steps = [
  {
    n: 1,
    icon: Camera,
    title: "Fotos + Sprache",
    text: "Vor Ort aufnehmen, fertig.",
  },
  {
    n: 2,
    icon: Sparkles,
    title: "KI schreibt",
    text: "Sauberer Protokolltext.",
  },
  {
    n: 3,
    icon: Send,
    title: "PDF raus",
    text: "Direkt beim Kunden.",
  },
];

const branchen = [
  {
    icon: Wrench,
    title: "KFZ",
    text: "Schadensdoku in 60 Sek. statt 20 Min.",
  },
  {
    icon: HardHat,
    title: "Handwerk",
    text: "Kein Zettelchaos mehr auf der Baustelle.",
  },
  {
    icon: Building2,
    title: "Hausmeister",
    text: "Objektberichte per Knopfdruck.",
  },
  {
    icon: Sparkles,
    title: "Reinigung",
    text: "Leistungsnachweis direkt nach dem Einsatz.",
  },
];

const starterPricingFeatures = [
  "Bis 50 Protokolle/Monat",
  "KI-Protokolltext",
  "PDF-Generierung",
  "Automatischer Mail-Versand",
  "Bewertungs-Automatik",
  "1 Benutzer",
];

const proPricingFeatures = [
  "Unbegrenzte Protokolle",
  "Alles aus Starter",
  "Priority Support",
  "Early Access zu neuen Features",
  "Team-Zugang (coming soon)",
];

const features = [
  {
    icon: Camera,
    title: "Foto-Upload & Sprachnotiz",
    text: "Mehrere Fotos, dazu kurz gesprochene Notiz — alles in einem Auftrag.",
  },
  {
    icon: Sparkles,
    title: "KI-Protokolltext",
    text: "Aus deinen Stichworten wird ein professioneller Fließtext.",
  },
  {
    icon: Mail,
    title: "PDF per Mail",
    text: "Versand an den Kunden, sobald du freigibst.",
  },
  {
    icon: Star,
    title: "Bewertungs-Automatik",
    text: "Feedback-Anfrage nach dem Einsatz — du behältst den Überblick.",
  },
];

function HeroMockCard() {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/60 md:p-5"
      aria-hidden
    >
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-left">
        <ClipboardList className="h-5 w-5 shrink-0 text-primary" strokeWidth={2} />
        <span className="text-sm font-semibold text-slate-900">
          Neues Protokoll
        </span>
      </div>
      <p className="mt-3 text-left text-sm text-slate-600">
        Kunde:{" "}
        <span className="font-medium text-slate-800">Max Mustermann</span>
      </p>
      <div className="mt-3 flex gap-2">
        <div className="h-16 w-20 shrink-0 rounded-lg bg-slate-200" />
        <div className="h-16 w-20 shrink-0 rounded-lg bg-slate-200" />
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left">
        <Mic className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span className="text-sm italic text-slate-600">
          „Ölwechsel gemacht“
        </span>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-left text-sm">
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="landing-mock-typing font-medium text-slate-700">
          KI generiert…
        </span>
        <span
          className="landing-mock-cursor inline-block h-4 w-0.5 shrink-0 rounded-sm bg-primary"
          aria-hidden
        />
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-left text-sm font-medium text-green-700">
        <Check className="h-4 w-4 shrink-0 text-green-600" strokeWidth={2.5} />
        <span>PDF gesendet</span>
        <Mail className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} />
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const navLinkClass =
    "inline-flex min-h-12 items-center rounded-lg px-3 text-sm font-medium text-white/85 transition hover:text-white";

  return (
    <div className="min-h-screen bg-white text-slate-700">
      <header
        className={`sticky top-0 z-50 border-b transition-[background-color,backdrop-filter,border-color] duration-200 ${
          scrolled
            ? "border-white/10 bg-slate-900/95 backdrop-blur-md"
            : "border-white/10 bg-slate-900"
        }`}
      >
        <div className="mx-auto flex h-14 min-h-[48px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="text-base font-bold tracking-tight text-white md:text-lg"
            onClick={closeMenu}
          >
            DokuHero
          </Link>

          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Hauptnavigation"
          >
            <a href="#features" className={navLinkClass}>
              Funktionen
            </a>
            <a href="#pricing" className={navLinkClass}>
              Preise
            </a>
            <Link
              href="/login"
              className="ml-2 inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-white/35 px-4 text-sm font-semibold text-white transition hover:border-white/60 hover:bg-white/10"
            >
              Anmelden
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
            >
              Kostenlos testen
            </Link>
          </nav>

          <button
            type="button"
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg text-white md:hidden"
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-nav"
            aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen ? (
          <div
            id="landing-mobile-nav"
            className="border-b border-white/10 bg-slate-900 px-4 pb-4 shadow-lg md:hidden"
          >
            <div className="flex flex-col gap-1 pt-2">
              <a
                href="#features"
                className={`${navLinkClass} w-full justify-start`}
                onClick={closeMenu}
              >
                Funktionen
              </a>
              <a
                href="#pricing"
                className={`${navLinkClass} w-full justify-start`}
                onClick={closeMenu}
              >
                Preise
              </a>
              <Link
                href="/login"
                className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-lg border-2 border-white/35 text-sm font-semibold text-white"
                onClick={closeMenu}
              >
                Anmelden
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white"
                onClick={closeMenu}
              >
                Kostenlos testen
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 py-12 sm:py-16 md:py-20 lg:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:items-center md:gap-12 lg:gap-16">
            <div className="text-left">
              <p className="inline-flex min-h-8 items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary md:text-sm">
                Neu: KI-Protokolle in 60 Sekunden
              </p>
              <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl md:mt-6 md:text-4xl lg:text-5xl">
                Schluss mit Papierkram.
                <span className="mt-1 block text-primary md:mt-2">
                  DokuHero erledigt das.
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 md:mt-5 md:text-lg">
                Foto machen, kurz sprechen — fertig. Professionelles PDF beim
                Kunden, automatisch.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/register"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-md shadow-primary/25 transition hover:bg-primary/90 md:min-h-[52px] md:px-10 md:text-lg"
                >
                  Kostenlos starten
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-6 py-3.5 text-base font-semibold text-slate-700 transition hover:bg-slate-100 md:min-h-[52px]"
                >
                  Wie es funktioniert
                  <ChevronDown className="h-5 w-5" aria-hidden />
                </a>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-2 text-sm text-slate-600 md:mt-10">
                <div className="flex gap-0.5 text-amber-400" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <span>
                  Bereits von KFZ-Werkstätten und Handwerkern genutzt
                </span>
              </div>
            </div>
            <div className="mx-auto w-full max-w-md md:mx-0 md:max-w-none md:justify-self-end">
              <HeroMockCard />
            </div>
          </div>
        </section>

        {/* So funktioniert's */}
        <section
          id="how-it-works"
          className="scroll-mt-20 bg-white px-4 py-14 sm:py-16 md:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl lg:text-4xl">
              So funktioniert&apos;s
            </h2>
            <ol className="mx-auto mt-10 flex max-w-4xl flex-col gap-8 md:mt-14 md:flex-row md:gap-6 lg:gap-8">
              {steps.map(({ n, icon: Icon, title, text }) => (
                <li
                  key={n}
                  className="relative flex flex-1 flex-col rounded-2xl border border-slate-200 bg-slate-50/80 p-6 text-center md:pt-8"
                >
                  <div className="absolute -top-3 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm">
                    {n}
                  </div>
                  <div className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Für wen */}
        <section
          id="branchen"
          className="scroll-mt-20 border-y border-slate-100 bg-slate-50 px-4 py-14 sm:py-16 md:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl lg:text-4xl">
              Für wen
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm text-slate-600 md:text-base">
              Teams vor Ort, wenig Lust auf Schreibtischarbeit.
            </p>
            <ul className="mx-auto mt-10 grid max-w-6xl grid-cols-2 gap-4 md:mt-12 md:grid-cols-4 md:gap-6">
              {branchen.map(({ icon: Icon, title, text }) => (
                <li
                  key={title}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md md:p-6"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary/15 md:h-16 md:w-16">
                    <Icon className="h-8 w-8 md:h-9 md:w-9" strokeWidth={2} />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900 md:text-lg">
                    {title}
                  </h3>
                  <p className="mt-2 text-xs leading-snug text-slate-600 md:text-sm md:leading-relaxed">
                    {text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="scroll-mt-20 bg-white px-4 py-14 sm:py-16 md:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl lg:text-4xl">
              Funktionen
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-6 md:mt-14 md:grid-cols-2 md:gap-8">
              {features.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 md:p-8"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 md:text-base">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social proof / Vertrauen */}
        <section
          id="trust"
          className="scroll-mt-20 border-y border-slate-100 bg-slate-50 px-4 py-14 sm:py-16 md:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
              {[
                { stat: "60 Sek", sub: "pro Protokoll" },
                { stat: "100%", sub: "Digital" },
                { stat: "30 Tage", sub: "kostenlos" },
              ].map(({ stat, sub }) => (
                <div
                  key={stat}
                  className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm"
                >
                  <p className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                    {stat}
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-600 md:text-base">
                    {sub}
                  </p>
                </div>
              ))}
            </div>
            <figure className="mx-auto mt-10 max-w-2xl rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm md:mt-12 md:px-10 md:py-10">
              <blockquote className="text-lg font-medium leading-relaxed text-slate-800 md:text-xl">
                &ldquo;Endlich kein Papierkram mehr nach der Arbeit.&rdquo;
              </blockquote>
              <figcaption className="mt-4 text-sm text-slate-500 md:text-base">
                — KFZ-Werkstatt, München (Beta-Tester)
              </figcaption>
            </figure>
          </div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="scroll-mt-20 bg-white px-4 py-14 sm:py-16 md:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl lg:text-4xl">
              Preise
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-sm text-slate-600 md:text-base">
              Einfache Pakete — du entscheidest, wie viel du protokollierst.
            </p>

            <div className="mx-auto mt-8 flex justify-center md:mt-10">
              <p className="inline-flex max-w-xl flex-col items-center gap-1 rounded-2xl bg-primary/10 px-5 py-3 text-center text-sm font-semibold text-primary sm:flex-row sm:gap-2 sm:px-8 sm:py-4 sm:text-base md:text-lg">
                <span className="leading-snug">
                  30 Tage kostenlos testen — keine Kreditkarte nötig
                </span>
              </p>
            </div>

            <div
              className="mx-auto mt-8 flex max-w-lg flex-col items-stretch justify-center gap-2 sm:mt-10 sm:flex-row sm:items-center"
              role="group"
              aria-label="Abrechnungszeitraum"
            >
              <div className="flex min-h-[48px] flex-1 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:max-w-md sm:flex-initial">
                <button
                  type="button"
                  onClick={() => setBilling("monthly")}
                  className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold transition sm:min-h-12 sm:px-4 sm:text-base ${
                    billing === "monthly"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Monatlich
                </button>
                <button
                  type="button"
                  onClick={() => setBilling("yearly")}
                  className={`min-h-11 flex-1 rounded-lg px-2 text-xs font-semibold leading-tight transition sm:min-h-12 sm:px-3 sm:text-sm md:text-base ${
                    billing === "yearly"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span className="block sm:inline">Jährlich</span>
                  <span className="block text-[0.7rem] font-medium text-slate-500 sm:ml-1 sm:inline sm:text-sm sm:text-slate-600">
                    — 2 Monate gratis
                  </span>
                </button>
              </div>
            </div>

            <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 md:mt-12 md:grid-cols-2 md:gap-8 md:items-stretch">
              <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <h3 className="text-xl font-bold text-slate-900">Starter</h3>
                <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-4xl font-extrabold tracking-tight text-primary md:text-5xl">
                    {billing === "monthly" ? "29€" : "23€"}
                  </span>
                  <span className="text-sm font-semibold text-slate-500 md:text-base">
                    /Monat netto
                  </span>
                </div>
                {billing === "yearly" ? (
                  <p className="mt-1 text-sm font-medium text-slate-600 md:text-base">
                    276€/Jahr
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-slate-500">
                  <span className="line-through">Normalpreis: 39€</span>
                </p>
                <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-slate-700 md:text-base">
                  {starterPricingFeatures.map((line) => (
                    <li key={line} className="flex gap-3">
                      <Check
                        className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="mt-auto inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 pt-6 text-sm font-semibold text-white transition hover:bg-primary/90 sm:text-base"
                >
                  30 Tage kostenlos starten
                </Link>
              </div>

              <div className="relative flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-white">Pro</h3>
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">
                    Beliebt
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
                    {billing === "monthly" ? "59€" : "47€"}
                  </span>
                  <span className="text-sm font-semibold text-slate-400 md:text-base">
                    /Monat netto
                  </span>
                </div>
                {billing === "yearly" ? (
                  <p className="mt-1 text-sm font-medium text-slate-300 md:text-base">
                    564€/Jahr
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-slate-500">
                  <span className="line-through">Normalpreis: 79€</span>
                </p>
                <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-slate-200 md:text-base">
                  {proPricingFeatures.map((line) => (
                    <li key={line} className="flex gap-3">
                      <Check
                        className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="mt-auto inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 pt-6 text-sm font-semibold text-white transition hover:bg-primary/90 sm:text-base"
                >
                  30 Tage kostenlos starten
                </Link>
              </div>
            </div>

            <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-slate-600 md:mt-12 md:text-base">
              Cancel anytime · No hidden fees
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-slate-900 px-4 py-14 sm:py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-white md:text-3xl lg:text-4xl">
              Bereit, Schluss mit Papierkram zu machen?
            </h2>
            <Link
              href="/register"
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary/90 md:mt-10 md:min-h-[52px] md:px-10 md:text-lg"
            >
              Jetzt 30 Tage kostenlos testen
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 px-4 py-10 text-slate-400 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <p className="order-2 text-center text-sm sm:order-1 sm:text-left">
            © 2026 DokuHero
          </p>
          <nav className="order-1 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm sm:order-2">
            <Link
              href="/datenschutz"
              className="min-h-12 min-w-[48px] inline-flex items-center justify-center font-medium transition hover:text-white"
            >
              Datenschutz
            </Link>
            <Link
              href="/impressum"
              className="min-h-12 min-w-[48px] inline-flex items-center justify-center font-medium transition hover:text-white"
            >
              Impressum
            </Link>
            <a
              href="mailto:kontakt@dokuhero.de"
              className="min-h-12 min-w-[48px] inline-flex items-center justify-center font-medium transition hover:text-white"
            >
              Kontakt
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
