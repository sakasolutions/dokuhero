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
    <aside className="hidden min-h-screen w-56 shrink-0 flex-col border-r border-white/10 bg-dark lg:flex">
      <div className="flex h-14 shrink-0 items-center border-b border-white/10 px-4">
        <span className="text-lg font-bold tracking-tight text-white">DokuHero</span>
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
                  ? "bg-primary text-white"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 border-t border-white/10 p-3">
        <Link
          href="/einstellungen"
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
            pathname === "/einstellungen" ||
            pathname.startsWith("/einstellungen/")
              ? "bg-primary text-white"
              : "text-white/75 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Settings className="h-5 w-5 shrink-0" />
          Einstellungen
        </Link>
      </div>
    </aside>
  );
}
