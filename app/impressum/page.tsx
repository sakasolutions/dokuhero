import Link from "next/link";

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link href="/" className="text-lg font-bold text-primary">
            DokuHero
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-bold text-slate-900">Impressum</h1>
        <p className="mt-6 text-slate-600">
          Die Impressumsangaben werden in Kürze ergänzt.
        </p>
        <p className="mt-8">
          <Link href="/" className="text-sm font-medium text-primary hover:underline">
            Zur Startseite
          </Link>
        </p>
      </main>
    </div>
  );
}
