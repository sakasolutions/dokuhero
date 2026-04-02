import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PreiseClient } from "./PreiseClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PreisePage() {
  const session = await getServerSession(authOptions);
  const betriebId = session?.user?.betrieb_id;
  if (!betriebId) {
    // Dashboard-Layout redirected bereits, aber als Fallback:
    return null;
  }

  const currentPlan = (session.user.plan as string | undefined) ?? "trial";

  let trialDaysLeft: number | null = null;
  if (currentPlan === "trial" && session.user.registriert_am) {
    const registriertAm = new Date(session.user.registriert_am);
    const trialEnde = new Date(
      registriertAm.getTime() + 30 * 24 * 60 * 60 * 1000
    );
    const jetzt = new Date();
    const tageUebrig = Math.ceil(
      (trialEnde.getTime() - jetzt.getTime()) / (1000 * 60 * 60 * 24)
    );
    trialDaysLeft = Number.isFinite(tageUebrig) ? tageUebrig : null;
  }

  return <PreiseClient currentPlan={currentPlan} trialDaysLeft={trialDaysLeft} />;
}

