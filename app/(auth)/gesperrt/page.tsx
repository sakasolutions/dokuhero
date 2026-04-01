import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function GesperrtPage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-primary">DokuHero</h1>
        <p className="mt-2 text-sm text-slate-600">Konto gesperrt</p>
      </div>
      <Card>
        <p className="text-center text-slate-800">
          Ihr Konto wurde gesperrt. Kontakt:{" "}
          <a
            href="mailto:kontakt@dokuhero.de"
            className="font-medium text-primary hover:underline"
          >
            kontakt@dokuhero.de
          </a>
        </p>
        <p className="mt-6 text-center text-sm text-slate-600">
          <Link href="/api/auth/signout?callbackUrl=/login" className="text-primary hover:underline">
            Abmelden
          </Link>
        </p>
      </Card>
    </div>
  );
}
