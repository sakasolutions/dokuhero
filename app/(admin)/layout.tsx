import Link from "next/link";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

const mobileLinks = [
  { href: "/admin", label: "Start" },
  { href: "/admin/betriebe", label: "Betriebe" },
  { href: "/admin/protokolle", label: "Protokolle" },
  { href: "/admin/bewertungen", label: "Bewertungen" },
];

export default function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white lg:hidden">
          <div className="flex h-14 items-center px-4">
            <Link href="/admin" className="text-lg font-semibold text-slate-900">
              DokuHero
            </Link>
            <span className="ml-2 rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold uppercase text-white">
              Admin
            </span>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-2 py-2 text-xs font-medium">
            {mobileLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1.5 text-slate-800"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-slate-600"
            >
              Zur App
            </Link>
          </nav>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
