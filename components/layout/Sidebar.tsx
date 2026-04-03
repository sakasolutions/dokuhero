"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Camera,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

export interface SidebarProps {
  rolle: string;
}

function itemActive(pathname: string, href: string, isInhaber: boolean): boolean {
  if (href === "/protokoll/neu") {
    return pathname === "/protokoll/neu";
  }
  if (href === "/protokolle") {
    if (isInhaber) {
      return (
        pathname === "/protokolle" ||
        pathname.startsWith("/protokolle/") ||
        pathname.startsWith("/protokoll/")
      );
    }
    return (
      pathname === "/protokolle" ||
      pathname.startsWith("/protokolle/") ||
      /^\/protokoll\/\d+/.test(pathname)
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ rolle }: SidebarProps) {
  const pathname = usePathname();
  const isInhaber = rolle === "inhaber";

  const links = isInhaber
    ? [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/protokolle", label: "Protokolle", icon: Camera },
        { href: "/auftraege", label: "Aufträge", icon: ClipboardList },
        { href: "/kunden", label: "Kunden", icon: Users },
      ]
    : [
        { href: "/protokoll/neu", label: "Protokoll", icon: Camera },
        { href: "/protokolle", label: "Meine Protokolle", icon: FileText },
      ];

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex h-14 shrink-0 items-center border-b border-white/10 px-4">
        <span className="text-lg font-bold tracking-tight text-white">DokuHero</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active = itemActive(pathname, href, isInhaber);
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
      {isInhaber ? (
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
      ) : null}
    </div>
  );
}
