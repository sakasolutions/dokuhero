import { Resend } from "resend";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseTimeToMinutesHm(hm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function formatEinsatzdauerLabel(
  von: string | null,
  bis: string | null
): string {
  if (!von?.trim() || !bis?.trim()) return "–";
  const a = parseTimeToMinutesHm(von);
  const b = parseTimeToMinutesHm(bis);
  if (a === null || b === null) return "–";
  let diff = b - a;
  if (diff < 0) diff += 24 * 60;
  const hh = Math.floor(diff / 60);
  const mm = diff % 60;
  return `${hh} Std. ${mm} Min.`;
}

function textToParagraphsHtml(s: string | null, emptyFallback: string): string {
  const t = s?.trim();
  if (!t) {
    return `<p style="margin:0;color:#64748b;">${escapeHtml(emptyFallback)}</p>`;
  }
  const lines = t.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return `<p style="margin:0;color:#64748b;">${escapeHtml(emptyFallback)}</p>`;
  }
  return lines
    .map(
      (line) =>
        `<p style="margin:0 0 6px;">${escapeHtml(line.trim())}</p>`
    )
    .join("");
}

function addressBlockHtml(adresse: string | null): string {
  const t = adresse?.trim();
  if (!t) {
    return `<span style="color:#64748b;">Keine Adresse hinterlegt</span>`;
  }
  return t
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => escapeHtml(line))
    .join("<br />");
}

function mailWrapper(
  content: string,
  betriebName: string,
  logoUrl?: string | null
): string {
  const safeName = escapeHtml(betriebName);
  const trimmedLogo = logoUrl?.trim();
  const header = trimmedLogo
    ? `<img src="${escapeHtml(trimmedLogo)}" height="36" style="display:block;" alt="${safeName}" />`
    : `<span style="color:#ffffff;font-weight:700;font-size:18px;line-height:1.3;">${safeName}</span>`;

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="background-color:#f8fafc;padding:40px 16px;">
    <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden;">
      <div style="background-color:#1e293b;padding:24px 32px;">
        ${header}
      </div>
      <div style="padding:32px;color:#334155;font-size:15px;line-height:1.6;">
        ${content}
      </div>
      <div style="padding:20px 32px;border-top:1px solid #f1f5f9;font-size:12px;color:#94a3b8;text-align:center;">
        Erstellt mit DokuHero · ${safeName}
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendProtokollMail(
  to: string,
  betriebName: string,
  pdfBuffer: Buffer,
  kundeName: string,
  logoUrl: string | null = null
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

  const namePart = kundeName.trim()
    ? ` ${escapeHtml(kundeName.trim())}`
    : "";
  const greeting = `Guten Tag${namePart},`;

  const content = `<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">anbei erhalten Sie Ihr Serviceprotokoll von <strong>${escapeHtml(betriebName)}</strong>. Das Dokument finden Sie als PDF-Anhang in dieser E-Mail.</p>
<hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;" />
<div style="background:#f8fafc;border-radius:8px;padding:16px;font-size:14px;color:#64748b;">
  📎 Ihr Protokoll ist als Anhang beigefügt (protokoll.pdf)
</div>
<p style="margin:24px 0 0;">Bei Fragen stehen wir Ihnen gerne zur Verfügung.<br />
Mit freundlichen Grüßen,<br />
<strong>${escapeHtml(betriebName)}</strong></p>`;

  const html = mailWrapper(content, betriebName, logoUrl);

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

/** Kopie des Kunden-Protokolls an den Betrieb (Inhaber), nach Versand an den Kunden. */
export async function sendProtokollKopieAnBetriebMail(
  betriebEmail: string,
  betriebName: string,
  kundeName: string,
  kundeEmpfangsEmail: string,
  pdfBuffer: Buffer,
  logoUrl: string | null = null
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
  const kn = kundeName.trim() || "Kunde";
  const subject = `Kopie: Serviceprotokoll an Kunden gesendet – ${kn}`;

  const content = `<p style="margin:0 0 16px;">Hallo,</p>
<p style="margin:0 0 16px;">ein Serviceprotokoll für <strong>${escapeHtml(kn)}</strong> wurde an <strong>${escapeHtml(kundeEmpfangsEmail)}</strong> versendet.</p>
<p style="margin:0;">Im Anhang finden Sie eine Kopie des PDFs.</p>`;

  const html = mailWrapper(content, betriebName, logoUrl);

  const { error } = await resend.emails.send({
    from,
    to: betriebEmail,
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

/** Intern: Protokoll nur gespeichert (mit Unterschrift), Benachrichtigung an Betriebs-E-Mail. */
export async function sendNeuesProtokollInternGespeichertMail(
  betriebEmail: string,
  betriebName: string,
  kundeName: string,
  kundeAdresse: string | null,
  einsatzVon: string | null,
  einsatzBis: string | null,
  anfahrtKm: number | null,
  anfahrtMinuten: number | null,
  leistungen: string | null,
  materialien: string | null,
  monteurName: string | null,
  pdfBuffer: Buffer,
  logoUrl: string | null
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
  const kn = kundeName.trim() || "Kunde";
  const datumHeute = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const subject = `Neues Protokoll – ${kn} – ${datumHeute}`;

  const ev = einsatzVon?.trim() || "–";
  const eb = einsatzBis?.trim() || "–";
  const dauer = formatEinsatzdauerLabel(einsatzVon, einsatzBis);
  const kmStr = anfahrtKm != null ? String(anfahrtKm) : "–";
  const minStr = anfahrtMinuten != null ? String(anfahrtMinuten) : "–";
  const monteur = monteurName?.trim() || "–";

  const sectionHead = (t: string) =>
    `<div style="font-size:11px;font-weight:700;letter-spacing:0.06em;color:#64748b;margin:0 0 8px;">${escapeHtml(t)}</div>`;

  const materialBlock =
    materialien?.trim() !== "" && materialien != null
      ? `<div style="border-top:1px solid #e2e8f0;padding-top:14px;margin-top:14px;">
  ${sectionHead("MATERIALIEN")}
  ${textToParagraphsHtml(materialien, "–")}
</div>`
      : "";

  const content = `<div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#fff;">
  <div style="background:#f8fafc;padding:14px 18px;border-bottom:1px solid #e2e8f0;">
    ${sectionHead("NEUES PROTOKOLL")}
    <p style="margin:0;font-size:17px;font-weight:600;color:#0f172a;">${escapeHtml(betriebName)}</p>
  </div>
  <div style="padding:18px;">
    <div style="border-bottom:1px solid #e2e8f0;padding-bottom:14px;margin-bottom:14px;">
      ${sectionHead("KUNDE")}
      <p style="margin:0 0 4px;font-weight:600;color:#0f172a;">${escapeHtml(kn)}</p>
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.5;">${addressBlockHtml(kundeAdresse)}</p>
    </div>
    <div style="border-bottom:1px solid #e2e8f0;padding-bottom:14px;margin-bottom:14px;">
      ${sectionHead("EINSATZ")}
      <p style="margin:0 0 6px;font-size:14px;"><strong>Datum:</strong> ${escapeHtml(datumHeute)}</p>
      <p style="margin:0 0 6px;font-size:14px;"><strong>Von:</strong> ${escapeHtml(ev)} &nbsp; <strong>Bis:</strong> ${escapeHtml(eb)}</p>
      <p style="margin:0 0 6px;font-size:14px;"><strong>Dauer:</strong> ${escapeHtml(dauer)}</p>
      <p style="margin:0 0 6px;font-size:14px;"><strong>Anfahrt:</strong> ${escapeHtml(kmStr)} km / ${escapeHtml(minStr)} Min.</p>
      <p style="margin:0;font-size:14px;"><strong>Monteur:</strong> ${escapeHtml(monteur)}</p>
    </div>
    <div style="border-bottom:1px solid #e2e8f0;padding-bottom:14px;margin-bottom:14px;">
      ${sectionHead("DURCHGEFÜHRTE ARBEITEN")}
      ${textToParagraphsHtml(leistungen, "–")}
    </div>
    ${materialBlock}
    <div style="margin-top:16px;padding-top:14px;border-top:1px solid #e2e8f0;">
      <p style="margin:0 0 6px;font-size:14px;">✅ Kunde hat unterschrieben</p>
      <p style="margin:0 0 6px;font-size:14px;">✅ Monteur hat unterschrieben</p>
      <p style="margin:0;font-size:14px;color:#64748b;">PDF im Anhang</p>
    </div>
  </div>
</div>`;

  const html = mailWrapper(content, betriebName, logoUrl);

  const { error } = await resend.emails.send({
    from,
    to: betriebEmail,
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
  urlNein: string,
  logoUrl: string | null = null
): Promise<void> {
  const { resend, from } = getResendClient();
  const subject = `Wie war Ihr Service bei ${betriebName}?`;

  const btn = (href: string, label: string, bg: string) =>
    `<td style="padding:8px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;background:${bg};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${escapeHtml(label)}</a>
    </td>`;

  const namePart = kundeName.trim()
    ? ` ${escapeHtml(kundeName.trim())}`
    : "";
  const greeting = `Guten Tag${namePart},`;

  const content = `<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">kürzlich haben wir Ihnen Ihr Serviceprotokoll von <strong>${escapeHtml(betriebName)}</strong> zugesendet. Wir würden uns über Ihr kurzes Feedback freuen.</p>
<p style="margin:0 0 16px;"><strong>Waren Sie mit unserem Service zufrieden?</strong></p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
  <tr>
    ${btn(urlJa, "👍 Ja, zufrieden", "#16a34a")}
    ${btn(urlNein, "👎 Nein, Probleme", "#dc2626")}
  </tr>
</table>
<p style="margin:0;font-size:13px;color:#94a3b8;">Mit einem Klick geben Sie uns kurz Bescheid — vielen Dank!</p>`;

  const html = mailWrapper(content, betriebName, logoUrl);

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

/** Info-Mail an Betrieb: Abo abgelaufen. */
export async function sendAboAbgelaufenMail(to: string): Promise<void> {
  const { resend, from } = getResendClient();
  const subject = "Dein DokuHero Abo ist abgelaufen";
  const url = "https://dokuhero.de/preise";

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #334155;">
  <p>Dein Abo ist abgelaufen.</p>
  <p>Bitte erneuere es unter <a href="${escapeHtml(url)}">${escapeHtml(url)}</a>, um weiter DokuHero zu nutzen.</p>
</body>
</html>`;

  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) throw new Error(error.message ?? "Resend-Versand fehlgeschlagen.");
}

function getLoginBaseUrl(): string {
  const u =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "https://dokuhero.de";
  return u.replace(/\/$/, "");
}

const REGISTRATION_ADMIN_NOTIFY_TO =
  process.env.REGISTRATION_NOTIFY_EMAIL?.trim() || "kontakt@dokuhero.de";

/** Interne Benachrichtigung: neuer Betrieb hat sich registriert. */
export async function sendNeuerBetriebAdminNotifyMail(opts: {
  betriebName: string;
  email: string;
  telefon: string | null;
  branche: string;
  betriebId: number;
}): Promise<void> {
  const { resend, from } = getResendClient();
  const adminUrl = `${getLoginBaseUrl()}/admin`;
  const datum = new Date().toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
  });
  const telefon =
    opts.telefon?.trim() && opts.telefon.trim().length > 0
      ? opts.telefon.trim()
      : "nicht angegeben";

  const subject = "🎉 Neuer DokuHero Nutzer registriert!";
  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #334155;">
  <h2 style="margin-top:0;">Neuer Betrieb registriert</h2>
  <p><strong>Name:</strong> ${escapeHtml(opts.betriebName)}</p>
  <p><strong>E-Mail:</strong> ${escapeHtml(opts.email)}</p>
  <p><strong>Telefon:</strong> ${escapeHtml(telefon)}</p>
  <p><strong>Branche:</strong> ${escapeHtml(opts.branche)}</p>
  <p><strong>Betrieb-ID:</strong> ${opts.betriebId}</p>
  <p><strong>Datum:</strong> ${escapeHtml(datum)}</p>
  <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #e2e8f0;" />
  <p><a href="${escapeHtml(adminUrl)}">Im Admin-Panel ansehen</a></p>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from,
    to: REGISTRATION_ADMIN_NOTIFY_TO,
    subject,
    html,
  });
  if (error) throw new Error(error.message ?? "Resend-Versand fehlgeschlagen.");
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

/** Passwort zurücksetzen – Link mit Token. */
export async function sendPasswortResetMail(
  to: string,
  resetUrl: string
): Promise<void> {
  const { resend, from } = getResendClient();
  const subject = "Passwort zurücksetzen – DokuHero";

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #334155;">
  <p>Hallo,</p>
  <p>du hast ein neues Passwort für DokuHero angefordert. Klicke auf den folgenden Link (gültig 1 Stunde):</p>
  <p><a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></p>
  <p style="font-size:0.9rem;color:#64748b;">Wenn du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.</p>
</body>
</html>`;

  const text = `Passwort zurücksetzen für DokuHero:\n\n${resetUrl}\n\nLink ist 1 Stunde gültig.`;

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });
  if (error) throw new Error(error.message ?? "Resend-Versand fehlgeschlagen.");
}
