import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";
import { resolveLogoDiskPathFromWebPath } from "@/lib/logo-upload";
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
  /** file://-URLs oder Web-Pfade wie /uploads/fotos/… (relativ zu public/) */
  fotoPfade: string[];
  /**
   * Web-Pfad z. B. `/uploads/logos/1.jpg` – wird per `resolveLogoDiskPathFromWebPath`
   * gelesen (u. a. `DOKUHERO_PUBLIC_DIR=/var/www/dokuhero/public` oder `LOGO_UPLOAD_DIR`).
   */
  betriebLogoPfad?: string | null;
};

function toDiskPath(fotoRef: string): string {
  const p = fotoRef.trim();
  if (p.startsWith("file:")) {
    return fileURLToPath(p);
  }
  const rel = p.startsWith("/") ? p.slice(1) : p;
  return join(process.cwd(), "public", rel);
}

function bufferToImageDataUri(buf: Buffer): string {
  const b64 = buf.toString("base64");
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8) {
    return `data:image/jpeg;base64,${b64}`;
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return `data:image/png;base64,${b64}`;
  }
  return `data:image/jpeg;base64,${b64}`;
}

async function loadBetriebLogoDataUri(
  logoPfad: string | null | undefined
): Promise<string | null> {
  if (!logoPfad?.trim()) return null;
  try {
    const diskPath = resolveLogoDiskPathFromWebPath(logoPfad);
    const buf = await readFile(diskPath);
    return bufferToImageDataUri(buf);
  } catch (e) {
    console.error("PDF: Logo konnte nicht gelesen werden:", logoPfad, e);
    return null;
  }
}

async function loadFotosAsDataUris(fotoPfade: string[]): Promise<string[]> {
  const uris: string[] = [];
  for (const ref of fotoPfade.slice(0, 6)) {
    try {
      const diskPath = toDiskPath(ref);
      const imageBuffer = await readFile(diskPath);
      uris.push(bufferToImageDataUri(imageBuffer));
    } catch (e) {
      console.error("PDF: Foto konnte nicht gelesen werden:", ref, e);
    }
  }
  return uris;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(
  data: ProtokollData,
  fotoDataUris: string[],
  logoDataUri: string | null
): string {
  const fotoCells = fotoDataUris
    .map(
      (src) =>
        `<div class="foto-cell"><img src=${JSON.stringify(src)} alt="" /></div>`
    )
    .join("");

  const logoBlock =
    logoDataUri != null
      ? `<div class="logo-wrap"><img src=${JSON.stringify(logoDataUri)} alt="" /></div>`
      : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; font-size: 11pt; color: #111; margin: 24px; line-height: 1.45; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .header-text { flex: 1; min-width: 0; }
    .logo-wrap { flex-shrink: 0; max-width: 160px; }
    .logo-wrap img { max-height: 56px; max-width: 160px; width: auto; height: auto; object-fit: contain; display: block; }
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
    <div class="header-text">
      <div class="betrieb">${esc(data.betriebName)}</div>
      <div class="subtitle">Serviceprotokoll</div>
    </div>
    ${logoBlock}
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
    fotoDataUris.length
      ? `<div class="block"><h2>Fotos</h2><div class="foto-grid">${fotoCells}</div></div>`
      : ""
  }
  <div class="footer">${esc(data.datum)} · Erstellt mit DokuHero</div>
</body>
</html>`;
}

export async function generatePDF(data: ProtokollData): Promise<Buffer> {
  await ensurePdfsUploadDir();

  const [fotoDataUris, logoDataUri] = await Promise.all([
    loadFotosAsDataUris(data.fotoPfade),
    loadBetriebLogoDataUri(data.betriebLogoPfad ?? null),
  ]);

  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const page = await browser.newPage();
    const html = buildHtml(data, fotoDataUris, logoDataUri);
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

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
