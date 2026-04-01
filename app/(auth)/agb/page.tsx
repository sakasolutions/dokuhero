import Link from "next/link";

export default function AgbPage() {
  return (
    <div className="w-full max-w-lg">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">Allgemeine Geschäftsbedingungen</h1>
        <p className="mt-2 text-sm text-slate-600">DokuHero</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
        <p>
          Hier können die AGB deines Angebots stehen. Diese Seite ist ein Platzhalter –
          bitte durch deine rechtlichen Texte ersetzen.
        </p>
      </div>
      <p className="mt-6 text-center">
        <Link href="/register" className="text-sm font-medium text-primary hover:underline">
          Zurück zur Registrierung
        </Link>
      </p>
    </div>
  );
}
