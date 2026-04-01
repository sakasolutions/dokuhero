"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
  FileText,
} from "lucide-react";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/betriebe", label: "Betriebe", icon: Building2 },
  { href: "/admin/protokolle", label: "Protokolle", icon: FileText },
  { href: "/admin/bewertungen", label: "Bewertungen", icon: MessageSquare },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-950 text-slate-100 lg:flex">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-800 px-4">
        <span className="text-lg font-semibold text-white">DokuHero</span>
        <span className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
          Admin
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/admin"
              ? pathname === "/admin"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-red-600/20 text-red-200"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 border-t border-slate-800 p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <ClipboardList className="h-5 w-5 shrink-0" />
          Zur App
        </Link>
      </div>
    </aside>
  );
}
