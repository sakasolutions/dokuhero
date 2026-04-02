"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PricingSection } from "@/components/PricingSection";
import { StatsSection } from "@/components/StatsSection";
import {
  Archive,
  Camera,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  Lock,
  Mail,
  Menu,
  Mic,
  PenLine,
  Send,
  Shield,
  Sparkles,
  Star,
  X,
} from "lucide-react";

const trustSecurityItems = [
  {
    icon: Shield,
    iconClass: "text-green-400",
    title: "DSGVO-konform",
    text: "Server in der EU, AVV mit allen\nDienstleistern abgeschlossen",
  },
  {
    icon: Archive,
    iconClass: "text-blue-400",
    title: "10 Jahre Aufbewahrung",
    text: "Rechtssicher nach § 147 AO —\nnie wieder Protokolle verlieren",
  },
  {
    icon: Lock,
    iconClass: "text-green-400",
    title: "SSL-verschlüsselt",
    text: "Alle Daten werden verschlüsselt\nübertragen und gespeichert",
  },
] as const;

const steps = [
  {
    n: 1,
    icon: Camera,
    title: "Fotos + Sprache",
    text: "Einfach vor Ort fotografieren und kurz einsprechen\nwas gemacht wurde — fertig.",
  },
  {
    n: 2,
    icon: Sparkles,
    title: "KI schreibt",
    text: "Unsere KI wandelt deine Stichpunkte in einen\nprofessionellen Protokolltext um.",
  },
  {
    n: 3,
    icon: Send,
    title: "PDF raus",
    text: "Das fertige PDF geht automatisch per Mail\ndirekt an deinen Kunden.",
  },
];

const kennstDuDasProbleme = [
  "„Ich schreib das später auf…“ — und vergisst es dann",
  "Kunde fragt nach Protokoll — du suchst den Zettel",
  "Nach der Arbeit noch stundenlang tippen",
  "Kein Nachweis bei Reklamationen",
  "Fotos auf dem Handy verstreut, nie geordnet",
] as const;

const kennstDuDasLoesungen = [
  "60 Sekunden vor Ort — fertig",
  "Kunde bekommt sofort sein PDF per Mail",
  "KI schreibt den professionellen Text für dich",
  "Alles dokumentiert, 10 Jahre rechtssicher",
  "Fotos, Notiz, PDF — alles an einem Ort",
] as const;

const landingFeatures = [
  {
    icon: Camera,
    eyebrow: "Nie wieder Fotos suchen",
    title: "Foto-Upload & Sprachnotiz",
    text: "Einfach vor Ort fotografieren und kurz einsprechen\n— alles wird automatisch dem Auftrag zugeordnet.",
  },
  {
    icon: Sparkles,
    eyebrow: "Kein Tippen nach der Arbeit",
    title: "KI-Protokolltext",
    text: "Deine Stichpunkte werden in einen professionellen\nProtokolltext verwandelt — in Sekunden.",
  },
  {
    icon: Send,
    eyebrow: "Kein Zettelchaos mehr",
    title: "PDF per Mail",
    text: "Das fertige PDF geht automatisch per Mail an\ndeinen Kunden — sobald du freigibst.",
  },
  {
    icon: Star,
    eyebrow: "Mehr Google-Bewertungen",
    title: "Bewertungs-Automatik",
    text: "2 Stunden nach dem Einsatz fragt DokuHero\nautomatisch nach Feedback — zufriedene Kunden landen\ndirekt auf deiner Google-Seite.",
  },
  {
    icon: PenLine,
    eyebrow: "Kein Streit bei Reklamationen",
    title: "Digitale Abnahme",
    text: "Kunde bestätigt das Protokoll digital —\nrechtssicher gespeichert.",
  },
  {
    icon: Shield,
    eyebrow: "Gesetzlich auf der sicheren Seite",
    title: "Rechtssichere Aufbewahrung",
    text: "Alle Protokolle werden 10 Jahre gespeichert\n— DSGVO-konform, manipulationssicher.",
    badge: { label: "GoBD-konform", variant: "green" as const },
  },
] as const;

const featureBadgeToneClass: Record<"amber" | "green", string> = {
  amber: "bg-amber-100 text-amber-700",
  green: "bg-green-100 text-green-700",
};

/** Dauer für Scroll-Einblendungen: mobil kürzer */
const animD = "duration-[400ms] md:duration-700";

function useInView(threshold = 0.1) {
  const [inView, setInView] = useState(false);
  const [node, setNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, threshold]);
  const ref = useCallback((el: HTMLElement | null) => setNode(el), []);
  return [ref, inView] as const;
}

/** Pfade relativ zur Site-Root: Dateien liegen in public/images/ (ohne „public“ im URL-Pfad). */
const HERO_FOTO_PATHS = [
  { src: "/images/hero-foto1.png", label: "Foto 1" },
  { src: "/images/hero-foto2.png", label: "Foto 2" },
] as const;

function HeroPhotoThumb({
  imageSrc,
  label,
}: {
  imageSrc: string;
  label: string;
}) {
  const [usePlaceholder, setUsePlaceholder] = useState(false);

  return (
    <figure className="flex shrink-0 flex-col items-center gap-1.5">
      <div className="relative h-16 w-20 overflow-hidden rounded-lg bg-slate-100 shadow-md shadow-slate-300/45">
        {!usePlaceholder ? (
          // eslint-disable-next-line @next/next/no-img-element -- lokale Hero-Assets optional
          <img
            src={imageSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setUsePlaceholder(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Camera
              className="h-6 w-6 text-slate-400"
              strokeWidth={1.75}
              aria-hidden
            />
          </div>
        )}
      </div>
      <figcaption className="text-center text-xs font-medium text-slate-500">
        {label}
      </figcaption>
    </figure>
  );
}

function HeroMockCard() {
  return (
    <div
      className="landing-mock-float w-full rounded-xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/60 md:p-5"
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
        {HERO_FOTO_PATHS.map(({ src, label }) => (
          <HeroPhotoThumb key={src} imageSrc={src} label={label} />
        ))}
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left">
        <Mic className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span className="text-sm italic text-slate-600">
          „Ölwechsel gemacht“
        </span>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-left text-sm">
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="font-medium text-slate-700">KI generiert…</span>
        <span
          className="landing-mock-cursor-blink inline-block h-4 w-0.5 shrink-0 rounded-sm bg-primary"
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

const navAnchorClass =
  "relative inline-flex min-h-12 items-center rounded-lg px-3 text-sm font-medium text-white/85 transition-colors after:pointer-events-none after:absolute after:bottom-1 after:left-3 after:h-0.5 after:w-0 after:bg-white after:transition-all after:duration-300 hover:text-white md:hover:after:w-[calc(100%-1.5rem)] active:after:w-[calc(100%-1.5rem)]";

const ctaBtnTransform =
  "transition-transform duration-200 md:hover:scale-105 active:scale-95";

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroOn, setHeroOn] = useState(false);

  const [howRef, howInView] = useInView(0.12);
  const [featuresRef, featuresInView] = useInView(0.08);

  useEffect(() => {
    const id = requestAnimationFrame(() => setHeroOn(true));
    return () => cancelAnimationFrame(id);
  }, []);

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
            className="flex items-center gap-2 outline-none ring-offset-2 ring-offset-slate-900 focus-visible:ring-2 focus-visible:ring-white/40"
            onClick={closeMenu}
            aria-label="DokuHero Startseite"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
            </div>
            <span className="font-sans text-xl font-bold text-white">
              DokuHero
            </span>
          </Link>

          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Hauptnavigation"
          >
            <a href="#features" className={navAnchorClass}>
              Funktionen
            </a>
            <a href="#pricing" className={navAnchorClass}>
              Preise
            </a>
            <Link
              href="/login"
              className={`${ctaBtnTransform} ml-2 inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-white/35 px-4 text-sm font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/10`}
            >
              Anmelden
            </Link>
            <Link
              href="/register"
              className={`${ctaBtnTransform} inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90`}
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
                className="inline-flex min-h-12 w-full items-center rounded-lg px-3 text-sm font-medium text-white/85 hover:text-white"
                onClick={closeMenu}
              >
                Funktionen
              </a>
              <a
                href="#pricing"
                className="inline-flex min-h-12 w-full items-center rounded-lg px-3 text-sm font-medium text-white/85 hover:text-white"
                onClick={closeMenu}
              >
                Preise
              </a>
              <Link
                href="/login"
                className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-lg border-2 border-white/35 text-sm font-semibold text-white active:bg-white/10"
                onClick={closeMenu}
              >
                Anmelden
              </Link>
              <Link
                href="/register"
                className={`${ctaBtnTransform} inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white`}
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
          <div className="mx-auto flex max-w-6xl flex-col gap-10 md:grid md:grid-cols-2 md:items-center md:gap-12 lg:gap-16">
            <div
              className={`order-1 text-left transition-all ease-out ${animD} ${
                heroOn
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              }`}
            >
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
                Foto machen, kurz sprechen — fertig.
                <span className="mt-1 block">
                  Dein Kunde bekommt ein professionelles Protokoll, ganz
                  automatisch.
                </span>
              </p>
              <div className="mt-8 flex w-full flex-col items-center gap-3 md:w-auto md:flex-row md:items-start">
                <Link
                  href="/register"
                  className={`${ctaBtnTransform} inline-flex w-full min-h-12 items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-md shadow-primary/25 transition-colors hover:bg-primary/90 md:w-auto md:min-h-[52px] md:px-10 md:text-lg`}
                >
                  Kostenlos starten
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex w-full min-h-12 items-center justify-center gap-1.5 rounded-xl px-6 py-3.5 text-center text-base font-semibold text-slate-700 transition-colors active:bg-slate-200 md:w-auto md:min-h-[52px] md:hover:bg-slate-100"
                >
                  Wie es funktioniert
                  <ChevronDown className="h-5 w-5 shrink-0" aria-hidden />
                </a>
              </div>
              <p className="mt-2 text-center text-sm text-slate-500 md:text-left">
                30 Tage kostenlos · ab 29 € /Monat · Monatlich kündbar
              </p>
              <div className="mt-8 flex w-full flex-wrap items-center justify-center gap-2 text-sm text-slate-600 md:mt-10 md:justify-start">
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
            <div className="order-2 w-full md:order-2 md:justify-self-end">
              <HeroMockCard />
            </div>
          </div>
        </section>

        {/* So funktioniert's */}
        <section
          id="how-it-works"
          ref={howRef}
          className="scroll-mt-20 bg-slate-50 px-4 py-14 sm:py-16 md:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl lg:text-4xl">
              So funktioniert&apos;s
            </h2>
            <ol className="mx-auto mt-10 flex max-w-5xl list-none flex-col gap-8 p-0 md:mt-14 md:flex-row md:items-center md:gap-0 md:px-2 lg:px-4">
              {steps.map(({ n, icon: Icon, title, text }, i) => (
                <Fragment key={n}>
                  <li
                    className={`relative flex flex-1 flex-col rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-md md:pt-8 ${animD} ${
                      howInView
                        ? "translate-y-0 opacity-100"
                        : "translate-y-12 opacity-0"
                    }`}
                    style={{
                      transitionDelay: howInView ? `${i * 200}ms` : "0ms",
                    }}
                  >
                    <div className="absolute -top-3 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm">
                      {n}
                    </div>
                    <div className="mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-8 w-8" strokeWidth={2} />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">
                      {title}
                    </h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                      {text}
                    </p>
                  </li>
                  {i < steps.length - 1 ? (
                    <li
                      className="hidden h-px w-full shrink-0 list-none p-0 md:flex md:h-auto md:w-10 md:min-w-[2.5rem] md:max-w-[3rem] md:items-center md:justify-center lg:w-14"
                      aria-hidden
                    >
                      <div className="h-0 w-full border-t border-dashed border-primary/30" />
                    </li>
                  ) : null}
                </Fragment>
              ))}
            </ol>
          </div>
        </section>

        {/* Kennst du das? */}
        <section
          id="kennst-du-das"
          className="scroll-mt-20 bg-white px-4 py-14 sm:py-16 md:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl lg:text-4xl">
              Kennst du das?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-base leading-relaxed text-slate-600 md:text-lg">
              Für alle, die ihre Arbeit lieben — aber nicht den Papierkram
              danach.
            </p>

            <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 md:mt-14 md:grid-cols-2 md:gap-8 lg:gap-10">
              <div className="rounded-2xl bg-red-50 px-6 py-8 sm:px-8 sm:py-10 md:px-10 md:py-12">
                <p className="mb-5 text-sm font-semibold uppercase tracking-wide text-red-600/90">
                  Probleme
                </p>
                <ul className="space-y-4">
                  {kennstDuDasProbleme.map((line) => (
                    <li
                      key={line}
                      className="flex gap-3 text-base leading-snug text-slate-700 md:text-[1.05rem] md:leading-relaxed"
                    >
                      <X
                        className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-green-50 px-6 py-8 sm:px-8 sm:py-10 md:px-10 md:py-12">
                <p className="mb-5 text-sm font-semibold uppercase tracking-wide text-green-700/90">
                  Lösung
                </p>
                <ul className="space-y-4">
                  {kennstDuDasLoesungen.map((line) => (
                    <li
                      key={line}
                      className="flex gap-3 text-base leading-snug text-slate-700 md:text-[1.05rem] md:leading-relaxed"
                    >
                      <Check
                        className="mt-0.5 h-5 w-5 shrink-0 text-green-500"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mx-auto mt-10 max-w-3xl text-center text-base leading-relaxed text-slate-600 md:mt-14 md:text-lg">
              Egal ob KFZ, Handwerk, Hausmeister, Reinigung oder Gartenbau —
              wenn du vor Ort arbeitest, ist DokuHero für dich.
            </p>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          ref={featuresRef}
          className="scroll-mt-20 bg-slate-50 px-4 py-14 sm:py-16 md:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl lg:text-4xl">
              Alles was du brauchst
            </h2>
            <p className="mx-auto mt-3 max-w-2xl whitespace-pre-line text-center text-base leading-relaxed text-slate-600 md:text-lg">
              Kein Schnickschnack — nur die Funktionen{"\n"}die deinen Alltag
              wirklich einfacher machen.
            </p>
            <div className="mt-10 grid grid-cols-1 gap-6 md:mt-14 md:grid-cols-2 md:gap-8">
              {landingFeatures.map((item, index) => {
                const Icon = item.icon;
                const diagMs = index * 75;
                const badge = "badge" in item ? item.badge : undefined;
                return (
                  <div
                    key={item.title}
                    className={`relative rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow duration-200 ease-out hover:shadow-md ${animD} ${
                      featuresInView
                        ? "translate-y-0 opacity-100"
                        : "translate-y-10 opacity-0"
                    }`}
                    style={{
                      transitionDelay: featuresInView ? `${diagMs}ms` : "0ms",
                    }}
                  >
                    {badge ? (
                      <span
                        className={`absolute right-4 top-4 rounded-full px-2 py-0.5 text-xs font-semibold ${featureBadgeToneClass[badge.variant]}`}
                      >
                        {badge.label}
                      </span>
                    ) : null}
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" strokeWidth={2} />
                    </div>
                    <p className="mt-4 text-sm font-medium text-slate-500">
                      {item.eyebrow}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">
                      {item.title}
                    </h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600 md:text-base">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Trust: DSGVO, Aufbewahrung, SSL */}
        <section
          className="scroll-mt-20 bg-slate-900 px-4 py-12 sm:py-14 md:py-16"
          aria-label="Sicherheit und Compliance"
        >
          <div className="mx-auto max-w-6xl">
            <p className="mb-10 text-center text-sm text-slate-400 md:mb-12">
              Sicherheit &amp; Datenschutz — kein Kompromiss
            </p>
            <ul className="flex flex-col md:flex-row md:items-stretch">
              {trustSecurityItems.map(({ icon: Icon, iconClass, title, text }, i) => (
                <li
                  key={title}
                  className={`flex flex-col items-center border-slate-700 px-4 py-8 text-center md:flex-1 md:px-6 md:py-4 ${
                    i < trustSecurityItems.length - 1
                      ? "border-b md:border-b-0 md:border-r"
                      : ""
                  }`}
                >
                  <Icon
                    className={`h-10 w-10 shrink-0 ${iconClass}`}
                    strokeWidth={2}
                    aria-hidden
                  />
                  <p className="mt-4 font-bold text-white md:mt-5">{title}</p>
                  <p className="mt-2 max-w-xs whitespace-pre-line text-sm leading-relaxed text-slate-400 md:max-w-none">
                    {text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <StatsSection />

        <PricingSection />

        {/* CTA */}
        <section className="bg-slate-900 px-4 py-14 sm:py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-white md:text-3xl lg:text-4xl">
              Bereit, Schluss mit Papierkram zu machen?
            </h2>
            <Link
              href="/register"
              className={`${ctaBtnTransform} mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-colors hover:bg-primary/90 md:mt-10 md:min-h-[52px] md:px-10 md:text-lg`}
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
              className="min-h-12 min-w-[48px] inline-flex items-center justify-center font-medium transition active:text-white md:hover:text-white"
            >
              Datenschutz
            </Link>
            <Link
              href="/impressum"
              className="min-h-12 min-w-[48px] inline-flex items-center justify-center font-medium transition active:text-white md:hover:text-white"
            >
              Impressum
            </Link>
            <Link
              href="/agb"
              className="min-h-12 min-w-[48px] inline-flex items-center justify-center font-medium transition active:text-white md:hover:text-white"
            >
              AGB
            </Link>
            <a
              href="mailto:kontakt@dokuhero.de"
              className="min-h-12 min-w-[48px] inline-flex items-center justify-center font-medium transition active:text-white md:hover:text-white"
            >
              Kontakt
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
