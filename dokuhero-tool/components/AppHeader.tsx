"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export function AppHeader({ email }: { email?: string | null }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <Link href="/baustellen" className="text-lg font-semibold text-slate-900">
        DokuHero
      </Link>
      <div className="flex items-center gap-3 text-sm text-slate-600">
        {email ? <span>{email}</span> : null}
        <button
          type="button"
          onClick={() => void signOut({ callbackUrl: "/login" })}
          className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50"
        >
          Abmelden
        </button>
      </div>
    </header>
  );
}
