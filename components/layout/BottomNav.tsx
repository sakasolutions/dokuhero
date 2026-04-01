"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, ClipboardList, LayoutDashboard, Users } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Start", icon: LayoutDashboard },
  { href: "/protokoll/neu", label: "Protokoll", icon: Camera },
  { href: "/auftraege", label: "Aufträge", icon: ClipboardList },
  { href: "/kunden", label: "Kunden", icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-dark px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
      <div className="mx-auto flex max-w-lg justify-around">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-[4rem] flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                active ? "text-primary" : "text-white/60"
              }`}
            >
              <Icon className="h-6 w-6" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
