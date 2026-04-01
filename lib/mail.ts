import nodemailer from "nodemailer";

export async function sendProtokolMail(
  to: string,
  betriebName: string,
  pdfBuffer: Buffer,
  protokollId: number
): Promise<void> {
  const host = process.env.MAIL_HOST;
  const port = Number(process.env.MAIL_PORT ?? "587");
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;
  const from = process.env.MAIL_FROM;

  if (!host || !user || pass === undefined || !from) {
    throw new Error(
      "SMTP nicht konfiguriert (MAIL_HOST, MAIL_USER, MAIL_PASS, MAIL_FROM)."
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const subject = `Ihr Serviceprotokoll von ${betriebName}`;
  const text = `Guten Tag,

anbei erhalten Sie Ihr Serviceprotokoll (Referenz #${protokollId}).

Mit freundlichen Grüßen
${betriebName}

—
Diese Nachricht wurde mit DokuHero erstellt.`;

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    attachments: [
      {
        filename: `protokoll-${protokollId}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}
