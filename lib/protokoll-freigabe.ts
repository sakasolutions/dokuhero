import type { Session } from "next-auth";

/**
 * Wer PDF erzeugen / Freigeben / Ablehnen darf.
 * Ohne PROTOKOLL_FREIGABE_EMAILS: alle angemeldeten Nutzer des Betriebs (bis Rollen-System).
 * Mit PROTOKOLL_FREIGABE_EMAILS (kommagetrennt): nur diese Login-E-Mails.
 */
export function sessionMayFreigebenProtokoll(session: Session | null): boolean {
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
