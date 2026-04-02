"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, CheckCircle, Star, Zap } from "lucide-react";

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function useCountUpEaseOut(
  target: number,
  durationMs: number,
  enabled: boolean
) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!enabled) {
      setValue(0);
      return;
    }
    let raf = 0;
    let cancelled = false;
    const t0 = performance.now();
    const tick = (now: number) => {
      if (cancelled) return;
      const linear = Math.min((now - t0) / durationMs, 1);
      const eased = easeOutCubic(linear);
      setValue(Math.round(target * eased));
      if (linear < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [target, durationMs, enabled]);
  return value;
}

const statsConfig = [
  {
    durationMs: 1500,
    suffix: " Sek",
    sub: "statt 15 Minuten tippen",
    Icon: Zap,
    iconClass: "text-blue-500",
    iconBg: "bg-blue-50",
    borderTop: "border-blue-500",
  },
  {
    durationMs: 1800,
    suffix: "%",
    sub: "kein Papier, kein Chaos",
    Icon: CheckCircle,
    iconClass: "text-green-500",
    iconBg: "bg-green-50",
    borderTop: "border-green-500",
  },
  {
    durationMs: 1200,
    suffix: " Tage",
    sub: "einfach ausprobieren",
    Icon: Calendar,
    iconClass: "text-purple-500",
    iconBg: "bg-purple-50",
    borderTop: "border-purple-500",
  },
] as const;

export function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const n60 = useCountUpEaseOut(60, statsConfig[0].durationMs, inView);
  const n100 = useCountUpEaseOut(100, statsConfig[1].durationMs, inView);
  const n30 = useCountUpEaseOut(30, statsConfig[2].durationMs, inView);
  const values = [n60, n100, n30];

  return (
    <section
      id="trust"
      ref={sectionRef}
      className="scroll-mt-20 border-y border-slate-100 bg-slate-50 px-4 py-14 sm:py-16 md:py-20"
      aria-label="Zahlen und Stimmen"
    >
      <div className="mx-auto max-w-6xl">
        <span className="mb-8 block text-center text-sm font-medium uppercase tracking-widest text-blue-600 md:mb-10">
          Zahlen die sprechen
        </span>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          {statsConfig.map((cfg, i) => {
            const Icon = cfg.Icon;
            const display = `${values[i]}${cfg.suffix}`;
            return (
              <div
                key={cfg.sub}
                className={`rounded-2xl border border-slate-200 border-t-2 ${cfg.borderTop} bg-white p-8 text-center shadow-sm transition-shadow duration-200 hover:shadow-md`}
              >
                <div
                  className={`mx-auto flex h-fit w-fit items-center justify-center rounded-full ${cfg.iconBg} p-2`}
                >
                  <Icon className={`h-8 w-8 ${cfg.iconClass}`} strokeWidth={2} />
                </div>
                <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                  {display}
                </p>
                <p className="mt-2 text-sm font-medium text-slate-600 md:text-base">
                  {cfg.sub}
                </p>
              </div>
            );
          })}
        </div>

        <figure className="mx-auto mt-10 max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:mt-12">
          <div
            className="mb-4 flex justify-center gap-0.5 text-yellow-400"
            aria-hidden
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className="h-5 w-5 fill-yellow-400 text-yellow-400"
              />
            ))}
          </div>
          <blockquote className="text-center text-lg italic leading-relaxed text-slate-800 md:text-xl">
            &ldquo;Endlich kein Papierkram mehr nach der Arbeit.&rdquo;
          </blockquote>
          <figcaption className="mt-6 flex items-center justify-center gap-3">
            <div
              className="h-8 w-8 shrink-0 rounded-full bg-slate-200"
              aria-hidden
            />
            <div className="text-left">
              <p className="font-bold text-slate-900">KFZ-Werkstatt, München</p>
              <p className="text-sm text-slate-500">Beta-Tester</p>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
