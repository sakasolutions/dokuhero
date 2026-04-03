"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Camera,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";

export interface BottomNavProps {
  rolle: string;
}

function planBadgeLabel(plan: string | null): string {
  const p = (plan ?? "").trim().toLowerCase();
  if (p === "pro") return "Pro";
  if (p === "starter") return "Starter";
  if (p === "trial") return "Trial";
  if (p === "expired") return "Abgelaufen";
  if (!p) return "Trial";
  return plan!.trim();
}

export function BottomNav({ rolle }: BottomNavProps) {
  const pathname = usePathname();
  const isInhaber = rolle === "inhaber";
  const [isOpen, setIsOpen] = useState(false);
  const [sheetEntered, setSheetEntered] = useState(false);
  const [betriebName, setBetriebName] = useState("");
  const [plan, setPlan] = useState<string | null>(null);

  const links = [
    { href: "/dashboard", label: "Start", icon: LayoutDashboard },
    {
      href: isInhaber ? "/protokolle" : "/protokoll/neu",
      label: isInhaber ? "Protokolle" : "Protokoll",
      icon: Camera,
    },
    { href: "/kunden", label: "Kunden", icon: Users },
  ];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/einstellungen");
        if (!res.ok) return;
        const j = (await res.json()) as {
          betrieb?: { name?: string; plan?: string | null };
        };
        if (cancelled) return;
        const n = j.betrieb?.name?.trim();
        setBetriebName(n && n.length > 0 ? n : "Betrieb");
        const pl = j.betrieb?.plan;
        setPlan(typeof pl === "string" ? pl : null);
      } catch {
        /* ignorieren */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSheetEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setSheetEntered(true));
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  const closeSheet = useCallback(() => {
    setSheetEntered(false);
    window.setTimeout(() => setIsOpen(false), 300);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, closeSheet]);

  const planKey = (plan ?? "").trim().toLowerCase();
  const showPreiseUpgrade = planKey === "starter";

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-dark px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <div className="mx-auto flex max-w-lg justify-around">
          {links.map(({ href, label, icon: Icon }) => {
            const isProtokollNav =
              href === "/protokolle" || href === "/protokoll/neu";
            const active = isProtokollNav
              ? isInhaber
                ? pathname === "/protokolle" ||
                  pathname.startsWith("/protokolle") ||
                  pathname.startsWith("/protokoll/")
                : pathname.startsWith("/protokoll") &&
                  !pathname.startsWith("/protokolle")
              : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-w-[3.25rem] flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[0.65rem] font-medium sm:min-w-[4rem] sm:px-3 sm:text-xs ${
                  active ? "text-primary" : "text-white/60"
                }`}
              >
                <Icon className="h-6 w-6 shrink-0" />
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className={`flex min-w-[3.25rem] flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[0.65rem] font-medium sm:min-w-[4rem] sm:px-3 sm:text-xs ${
              isOpen ? "text-primary" : "text-white/60"
            }`}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            aria-label="Mehr"
          >
            <Menu className="h-6 w-6 shrink-0" />
            Mehr
          </button>
        </div>
      </nav>

      {isOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50"
            aria-label="Menü schließen"
            onClick={closeSheet}
          />
          <div
            className={`fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white pb-8 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out ${
              sheetEntered ? "translate-y-0" : "translate-y-full"
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bottom-nav-sheet-title"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 pb-4 pt-3">
              <div className="min-w-0 flex-1">
                <p
                  id="bottom-nav-sheet-title"
                  className="truncate text-lg font-bold text-slate-900"
                >
                  {betriebName || "Betrieb"}
                </p>
                <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {planBadgeLabel(plan)}
                </span>
              </div>
              <button
                type="button"
                onClick={closeSheet}
                className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-2 py-2">
              {isInhaber ? (
                <Link
                  href="/einstellungen"
                  onClick={closeSheet}
                  className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  <Settings className="h-5 w-5 shrink-0 text-slate-500" />
                  Einstellungen
                </Link>
              ) : null}
              {isInhaber && showPreiseUpgrade ? (
                <Link
                  href="/preise"
                  onClick={closeSheet}
                  className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  <Sparkles className="h-5 w-5 shrink-0 text-primary" />
                  Preise / Upgrade
                </Link>
              ) : null}
            </div>

            <div className="mx-4 border-t border-slate-200" />

            <div className="p-4">
              <button
                type="button"
                onClick={() =>
                  void signOut({ callbackUrl: "/login" })
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
              >
                <LogOut className="h-5 w-5" />
                Abmelden
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
