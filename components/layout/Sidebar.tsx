"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Camera,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/protokoll/neu", label: "Protokoll", icon: Camera },
  { href: "/auftraege", label: "Aufträge", icon: ClipboardList },
  { href: "/kunden", label: "Kunden", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-56 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-14 shrink-0 items-center border-b border-slate-200 px-4">
        <span className="text-lg font-semibold text-primary">DokuHero</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 border-t border-slate-200 p-3">
        <Link
          href="/einstellungen"
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
            pathname === "/einstellungen" ||
            pathname.startsWith("/einstellungen/")
              ? "bg-primary/10 text-primary"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Settings className="h-5 w-5 shrink-0" />
          Einstellungen
        </Link>
      </div>
    </aside>
  );
}
