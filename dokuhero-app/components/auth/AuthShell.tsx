import Link from "next/link";
import { FileText } from "lucide-react";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <aside className="relative hidden h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 lg:sticky lg:top-0 lg:flex lg:flex-col">
        <div className="flex h-full flex-col justify-between p-10">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-5 w-5 text-white" strokeWidth={2} />
            </span>
            DokuHero
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-white">Baustelle dokumentieren</h2>
            <p className="mt-3 text-slate-300">Sprache, KI, PDF — an einem Ort.</p>
          </div>
          <p className="text-xs text-slate-500">© DokuHero</p>
        </div>
      </aside>
      <div className="flex min-h-screen flex-col bg-white lg:bg-slate-50">
        <div className="flex flex-1 items-center justify-center px-6 py-10 lg:p-12">
          <div className="w-full max-w-sm">
            <div className="mb-6 lg:hidden">
              <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                ← Start
              </Link>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
