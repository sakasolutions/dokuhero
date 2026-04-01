import { writeFile } from "fs/promises";
import { join } from "path";
import puppeteer from "puppeteer";
import { ensurePdfsUploadDir, getPdfsUploadDir } from "@/lib/protokoll-upload";

export type ProtokolData = {
  betriebName: string;
  kundeName: string;
  datum: string;
  beschreibung: string;
  kiText: string;
  /** Absolute file://-URLs für <img src> */
  fotos: string[];
  protokollId: number;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(data: ProtokolData): string {
  const fotos = data.fotos.slice(0, 6);
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
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
    .betrieb { font-size: 18pt; font-weight: 700; color: #1e40af; }
    .logo-ph { width: 80px; height: 80px; border: 2px dashed #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 9pt; text-align: center; }
    h2 { font-size: 12pt; margin: 16px 0 6px; color: #334155; }
    .block { margin-bottom: 14px; }
    .protokoll { white-space: pre-wrap; }
    .foto-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; page-break-inside: avoid; }
    .foto-cell { aspect-ratio: 1; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: #f8fafc; }
    .foto-cell img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9pt; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="betrieb">${esc(data.betriebName)}</div>
    <div class="logo-ph">Logo</div>
  </div>
  <div class="block">
    <h2>Kunde &amp; Datum</h2>
    <p><strong>Kunde:</strong> ${esc(data.kundeName)}<br/><strong>Datum:</strong> ${esc(data.datum)}</p>
  </div>
  <div class="block">
    <h2>Auftragsbeschreibung</h2>
    <p>${esc(data.beschreibung || "–")}</p>
  </div>
  <div class="block">
    <h2>Protokoll</h2>
    <p class="protokoll">${esc(data.kiText)}</p>
  </div>
  ${
    fotos.length
      ? `<div class="block"><h2>Fotos</h2><div class="foto-grid">${fotoCells}</div></div>`
      : ""
  }
  <div class="footer">Erstellt mit DokuHero</div>
</body>
</html>`;
}

export async function generatePDF(data: ProtokolData): Promise<Buffer> {
  await ensurePdfsUploadDir();

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
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
