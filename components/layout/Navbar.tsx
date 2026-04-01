"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Navbar({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200/80 bg-surface px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-dark lg:hidden">DokuHero</span>
        {title ? (
          <span className="text-base font-medium text-dark">{title}</span>
        ) : null}
      </div>
      <Button
        variant="ghost"
        className="gap-2 !px-3"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Abmelden</span>
      </Button>
    </header>
  );
}
