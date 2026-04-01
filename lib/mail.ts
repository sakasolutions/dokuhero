import { Resend } from "resend";

export async function sendProtokollMail(
  to: string,
  betriebName: string,
  pdfBuffer: Buffer,
  kundeName: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY ist nicht gesetzt.");
  }
  if (!from) {
    throw new Error("MAIL_FROM ist nicht gesetzt.");
  }

  const resend = new Resend(apiKey);
  const subject = `Ihr Serviceprotokoll von ${betriebName}`;

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #334155;">
  <p>Guten Tag${kundeName ? ` ${escapeHtml(kundeName)}` : ""},</p>
  <p>anbei erhalten Sie Ihr Serviceprotokoll von <strong>${escapeHtml(betriebName)}</strong>.</p>
  <p>Bei Rückfragen stehen wir Ihnen gerne zur Verfügung.</p>
  <p style="margin-top: 1.5rem;">Mit freundlichen Grüßen<br/><strong>${escapeHtml(betriebName)}</strong></p>
  <p style="margin-top: 2rem; font-size: 0.85rem; color: #94a3b8;">Erstellt mit DokuHero</p>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    attachments: [
      {
        filename: "protokoll.pdf",
        content: pdfBuffer,
      },
    ],
  });

  if (error) {
    throw new Error(error.message ?? "Resend-Versand fehlgeschlagen.");
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getResendClient(): { resend: Resend; from: string } {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey) throw new Error("RESEND_API_KEY ist nicht gesetzt.");
  if (!from) throw new Error("MAIL_FROM ist nicht gesetzt.");
  return { resend: new Resend(apiKey), from };
}

/** Zufriedenheits-Mail nach Protokoll (Links Ja/Nein). */
export async function sendZufriedenheitsAnfrageMail(
  to: string,
  betriebName: string,
  kundeName: string,
  urlJa: string,
  urlNein: string
): Promise<void> {
  const { resend, from } = getResendClient();
  const subject = `Wie war Ihr Service bei ${betriebName}?`;

  const btn = (href: string, label: string, bg: string) =>
    `<td style="padding:8px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:16px 24px;background:${bg};color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;">${label}</a>
    </td>`;

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #334155; max-width: 560px;">
  <p>Guten Tag${kundeName ? ` ${escapeHtml(kundeName)}` : ""},</p>
  <p>kürzlich haben wir Ihnen ein Serviceprotokoll von <strong>${escapeHtml(betriebName)}</strong> per E-Mail gesendet.</p>
  <p><strong>Waren Sie mit unserem Service zufrieden?</strong></p>
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
    <tr>
      ${btn(urlJa, "👍 Ja, ich war zufrieden", "#16a34a")}
      ${btn(urlNein, "👎 Nein, es gab Probleme", "#dc2626")}
    </tr>
  </table>
  <p style="font-size:0.85rem;color:#94a3b8;">Mit einem Klick geben Sie uns kurz Bescheid. Vielen Dank!</p>
</body>
</html>`;

  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) throw new Error(error.message ?? "Resend-Versand fehlgeschlagen.");
}

/** Negatives Kunden-Feedback an den Betrieb. */
export async function sendNegativesFeedbackAnBetriebMail(
  betriebEmail: string,
  betriebName: string,
  kundeName: string,
  feedbackText: string
): Promise<void> {
  const { resend, from } = getResendClient();
  const subject = `Negatives Feedback von ${kundeName || "Kunde"}`;

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #334155;">
  <p>Hallo ${escapeHtml(betriebName)},</p>
  <p>Ein Kunde (${escapeHtml(kundeName || "ohne Namen")}) hat nach dem Serviceprotokoll negatives Feedback hinterlassen:</p>
  <blockquote style="margin:16px 0;padding:12px 16px;background:#fef2f2;border-left:4px solid #dc2626;white-space:pre-wrap;">${escapeHtml(feedbackText)}</blockquote>
  <p>Bitte melden Sie sich bei Bedarf beim Kunden.</p>
  <p style="font-size:0.85rem;color:#94a3b8;">DokuHero – Bewertungsautomatik</p>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from,
    to: betriebEmail,
    subject,
    html,
  });
  if (error) throw new Error(error.message ?? "Resend-Versand fehlgeschlagen.");
}

function getLoginBaseUrl(): string {
  const u =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "https://dokuhero.de";
  return u.replace(/\/$/, "");
}

/** Willkommens-Mail nach Registrierung. */
export async function sendWillkommenMail(
  to: string,
  betriebName: string
): Promise<void> {
  const { resend, from } = getResendClient();
  const subject = "Willkommen bei DokuHero!";
  const loginUrl = `${getLoginBaseUrl()}/login`;

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #334155;">
  <p>Hallo ${escapeHtml(betriebName)},</p>
  <p>dein Konto ist jetzt aktiv. Du kannst dich unter<br/>
  <a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a> einloggen.</p>
  <p style="margin-top: 1.5rem;">Dein DokuHero Team</p>
</body>
</html>`;

  const text = `Hallo ${betriebName},

dein Konto ist jetzt aktiv. Du kannst dich unter ${loginUrl} einloggen.

Dein DokuHero Team`;

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });
  if (error) throw new Error(error.message ?? "Resend-Versand fehlgeschlagen.");
}
