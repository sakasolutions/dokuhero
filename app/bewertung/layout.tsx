import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bewertung | DokuHero",
  robots: { index: false, follow: false },
};

export default function BewertungLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-12">
      <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {children}
      </div>
      <p className="mx-auto mt-8 max-w-lg text-center text-xs text-slate-400">
        DokuHero
      </p>
    </div>
  );
}
