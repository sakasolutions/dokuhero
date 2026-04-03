import type { Session } from "next-auth";

export function sessionMayFreigebenProtokoll(
  session: Session | null
): boolean {
  if (!session?.user) return false;

  // Neue Logik: Nur Inhaber dürfen freigeben
  if (session.user.rolle === "inhaber") return true;

  // Fallback für alte Accounts ohne rolle
  // (haben noch kein Multi-User Setup)
  // Wenn keine rolle gesetzt aber email vorhanden →
  // altes System, trotzdem erlauben
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return false;

  const raw = process.env.PROTOKOLL_FREIGABE_EMAILS?.trim();
  if (!raw) return true;

  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(email);
}
