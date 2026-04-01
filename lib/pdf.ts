import { writeFile } from "fs/promises";
import { join } from "path";
import puppeteer from "puppeteer";
import { ensurePdfsUploadDir, getPdfsUploadDir } from "@/lib/protokoll-upload";

export type ProtokollData = {
  protokollId: number;
  betriebName: string;
  kundeName: string;
  datum: string;
  /** z. B. Auftrags-ID */
  auftragsnummer: string;
  beschreibung: string;
  kiText: string;
  /** Absolute file://-URLs für <img src> */
  fotoPfade: string[];
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(data: ProtokollData): string {
  const fotos = data.fotoPfade.slice(0, 6);
  const fotoCells = fotos
    .map(
      (src) =>
        `<div class="foto-cell"><img src=${JSON.stringify(src)} alt="" /></div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; font-size: 11pt; color: #111; margin: 24px; line-height: 1.45; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 14px; margin-bottom: 20px; }
    .betrieb { font-size: 22pt; font-weight: 800; color: #1e40af; letter-spacing: -0.02em; }
    .subtitle { font-size: 12pt; color: #64748b; margin-top: 4px; font-weight: 600; }
    .info { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; }
    .info-row { margin: 4px 0; }
    .info-label { color: #64748b; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.04em; }
    h2 { font-size: 12pt; margin: 18px 0 8px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .arbeiten { white-space: pre-wrap; }
    .foto-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; page-break-inside: avoid; }
    .foto-cell { aspect-ratio: 1; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: #f8fafc; }
    .foto-cell img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9pt; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="betrieb">${esc(data.betriebName)}</div>
    <div class="subtitle">Serviceprotokoll</div>
  </div>
  <div class="info">
    <div class="info-row"><span class="info-label">Kunde</span><br/><strong>${esc(data.kundeName)}</strong></div>
    <div class="info-row" style="margin-top:10px"><span class="info-label">Datum</span><br/><strong>${esc(data.datum)}</strong></div>
    <div class="info-row" style="margin-top:10px"><span class="info-label">Auftragsnummer</span><br/><strong>${esc(data.auftragsnummer)}</strong></div>
  </div>
  <div class="block">
    <h2>Auftragsbeschreibung</h2>
    <p>${esc(data.beschreibung || "–")}</p>
  </div>
  <div class="block">
    <h2>Durchgeführte Arbeiten</h2>
    <p class="arbeiten">${esc(data.kiText)}</p>
  </div>
  ${
    fotos.length
      ? `<div class="block"><h2>Fotos</h2><div class="foto-grid">${fotoCells}</div></div>`
      : ""
  }
  <div class="footer">${esc(data.datum)} · Erstellt mit DokuHero</div>
</body>
</html>`;
}

export async function generatePDF(data: ProtokollData): Promise<Buffer> {
  await ensurePdfsUploadDir();

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    const html = buildHtml(data);
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        })
      )
    );

    const pdfUint8 = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
    });

    const buffer = Buffer.from(pdfUint8);
    const outPath = join(getPdfsUploadDir(), `${data.protokollId}.pdf`);
    await writeFile(outPath, buffer);
    return buffer;
  } finally {
    await browser.close();
  }
}
