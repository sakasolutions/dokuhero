/** Admin-Zugang per ENV (Kleinbuchstaben vergleichen). */
export function getAdminEmailNormalized(): string | undefined {
  const e = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return e || undefined;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const admin = getAdminEmailNormalized();
  if (!admin || !email) return false;
  return email.trim().toLowerCase() === admin;
}
