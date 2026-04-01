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
