import Link from "next/link";
import { FileText } from "lucide-react";

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-6">
      <Link
        href="/"
        className="absolute left-6 top-6 flex items-center gap-1 text-sm text-blue-300 transition-colors hover:text-white"
      >
        ← Zurück
      </Link>
      {children}
    </div>
  );
}

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
          <FileText
            className="h-5 w-5 text-white"
            strokeWidth={2}
            aria-hidden
          />
        </span>
        <span className="text-lg font-bold text-slate-900">DokuHero</span>
      </div>
      {children}
    </div>
  );
}
