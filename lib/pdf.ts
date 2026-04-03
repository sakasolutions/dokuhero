import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";
import { resolveLogoDiskPathFromWebPath } from "@/lib/logo-upload";
import {
  ensurePdfsUploadDir,
  getPdfsUploadDir,
  resolveFotoDiskPathFromWebPath,
} from "@/lib/protokoll-upload";

export type ProtokollData = {
  protokollId: number;
  betriebName: string;
  kundeName: string;
  kundeAdresse?: string | null;
  kundeTelefon?: string | null;
  datum: string;
  kiText: string;
  /** Optional: verwendete Materialien / Positionen */
  materialien?: string | null;
  /** file://-URLs oder Web-Pfade wie /uploads/fotos/… (relativ zu public/) */
  fotoPfade: string[];
  /**
   * Web-Pfad z. B. `/uploads/logos/1.jpg` – wird per `resolveLogoDiskPathFromWebPath`
   * gelesen (u. a. `DOKUHERO_PUBLIC_DIR=/var/www/dokuhero/public` oder `LOGO_UPLOAD_DIR`).
   */
  betriebLogoPfad?: string | null;
  /** data:image/png;base64,… — Unterschrift Kunde */
  unterschriftDataUri?: string | null;
  /** data:image/png;base64,… — Unterschrift Monteur */
  monteurUnterschriftDataUri?: string | null;
  monteurName?: string | null;
  betriebTelefon?: string | null;
  betriebAdresse?: string | null;
};

function toFotoDiskPath(fotoRef: string): string {
  const p = fotoRef.trim();
  if (p.startsWith("file:")) {
    return fileURLToPath(p);
  }
  return resolveFotoDiskPathFromWebPath(p);
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

/** Bilder > 200 KB: max. 1200 px Kantenlänge (JPEG), sonst Original. */
async function compressFotoBufferIfNeeded(buf: Buffer): Promise<Buffer> {
  if (buf.length <= 200 * 1024) return buf;
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(buf)
      .rotate()
      .resize(1200, 1200, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    return Buffer.from(out) as Buffer;
  } catch (e) {
    console.error("PDF: Foto-Kompression übersprungen:", e);
    return buf;
  }
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
    const diskPath = toFotoDiskPath(ref);
    try {
      const rawFile = await readFile(diskPath);
      const imageBuffer: Buffer = await compressFotoBufferIfNeeded(rawFile);
      uris.push(bufferToImageDataUri(imageBuffer));
    } catch {
      console.error("Foto nicht gefunden:", diskPath);
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

function formatErstelltMeta(
  betriebName: string,
  adresse: string | null | undefined,
  telefon: string | null | undefined
): string {
  const parts = ["Erstellt mit DokuHero", betriebName];
  const a = adresse?.trim();
  const t = telefon?.trim();
  if (a) parts.push(a);
  if (t) parts.push(t);
  return parts.map((p) => esc(p)).join(" · ");
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

  const materialienTrimmed = data.materialien?.trim() ?? "";
  const materialienItems = materialienTrimmed
    .split("\n")
    .map((m) => m.trim())
    .filter(Boolean)
    .map((m) => `<li>${esc(m)}</li>`)
    .join("");

  const materialienBlock =
    materialienItems.length > 0
      ? `
    <div class="section block">
      <div class="section-title">Verwendete Materialien</div>
      <ul class="materialien-list">
        ${materialienItems}
      </ul>
    </div>`
      : "";

  const kundeAdresseRaw = data.kundeAdresse?.trim();
  const kundeAdresseAnzeige = kundeAdresseRaw ? esc(kundeAdresseRaw) : "–";

  const kundeTelefonRaw = data.kundeTelefon?.trim();
  const kundeTelefonAnzeige = kundeTelefonRaw ? esc(kundeTelefonRaw) : "";

  const fotosPage =
    fotoDataUris.length > 0
      ? `
  <div class="page-break">
    <div class="content foto-page-inner">
      <div class="section-title">Fotodokumentation</div>
      <div class="foto-grid">${fotoCells}</div>
    </div>
  </div>`
      : "";

  const monteurNameEsc = esc(
    data.monteurName?.trim() ? data.monteurName.trim() : "–"
  );

  const kundeSigBlock = data.unterschriftDataUri?.trim()
    ? `<img class="sig-kunde-img" src=${JSON.stringify(data.unterschriftDataUri.trim())} alt="Unterschrift Kunde" />`
    : `<div class="sig-line-empty" aria-hidden="true"></div>`;

  const monteurSigBlock = data.monteurUnterschriftDataUri?.trim()
    ? `<img class="sig-monteur-img" src=${JSON.stringify(data.monteurUnterschriftDataUri.trim())} alt="Unterschrift Monteur" />`
    : `<div class="sig-line-empty" aria-hidden="true"></div>`;

  const erstelltMeta = formatErstelltMeta(
    data.betriebName,
    data.betriebAdresse,
    data.betriebTelefon
  );

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 10.5pt;
      color: #1e293b;
      margin: 0;
      line-height: 1.5;
    }

    .page-break {
      page-break-before: always;
      break-before: page;
    }

    /* HEADER (nur Seite 1) */
    .header {
      background: #1e293b;
      color: white;
      padding: 24px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-left { flex: 1; }
    .betrieb {
      font-size: 18pt;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.01em;
    }
    .subtitle {
      font-size: 10pt;
      color: #94a3b8;
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 500;
    }
    .logo-wrap { flex-shrink: 0; margin-left: 24px; }
    .logo-wrap img {
      max-height: 48px;
      max-width: 140px;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
    }

    .content { padding: 28px 32px; }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 28px;
    }
    .info-cell {
      padding: 12px 16px;
      border-right: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-cell:nth-child(even) { border-right: none; }
    .info-cell:nth-last-child(-n+2) { border-bottom: none; }
    .info-label {
      font-size: 8pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
      margin-bottom: 3px;
    }
    .info-value {
      font-size: 11pt;
      font-weight: 600;
      color: #0f172a;
    }

    .section { margin-bottom: 24px; }
    .section-title {
      font-size: 9pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding-bottom: 6px;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 12px;
    }
    .section-content {
      font-size: 10.5pt;
      color: #1e293b;
      line-height: 1.65;
      white-space: pre-wrap;
    }

    .materialien-list {
      list-style: none;
      padding: 0;
    }
    .materialien-list li {
      padding: 6px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 10.5pt;
      color: #1e293b;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .materialien-list li:last-child { border-bottom: none; }
    .materialien-list li::before {
      content: "·";
      color: #94a3b8;
      font-weight: 700;
      flex-shrink: 0;
    }

    .foto-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 4px;
    }
    .foto-cell {
      aspect-ratio: 4/3;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      background: #f8fafc;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .foto-cell img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* Unterschrift — letzte Seite */
    .signature-page {
      page-break-inside: avoid;
    }
    .signature-page .section-title {
      margin-bottom: 16px;
    }
    .sig-two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      align-items: start;
    }
    .sig-col-title {
      font-size: 8pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 10px;
    }
    .sig-kunde-img {
      width: 100%;
      max-height: 120px;
      object-fit: contain;
      object-position: left top;
      display: block;
    }
    .sig-line-empty {
      min-height: 72px;
      border-bottom: 1px solid #cbd5e1;
      margin-bottom: 4px;
    }
    .sig-monteur-img {
      width: 100%;
      max-height: 120px;
      object-fit: contain;
      object-position: left top;
      display: block;
    }
    .hline {
      border: none;
      border-top: 1px solid #1e293b;
      margin: 12px 0 10px;
    }
    .sig-field-label {
      font-size: 8.5pt;
      color: #64748b;
      margin-top: 8px;
    }
    .sig-field-value {
      font-size: 10.5pt;
      font-weight: 600;
      color: #0f172a;
      margin-top: 2px;
    }
    .sig-monteur-block {
      margin-top: 0;
    }
    .sig-monteur-name {
      font-size: 10.5pt;
      font-weight: 600;
      color: #0f172a;
      margin-top: 10px;
    }
    .sig-monteur-betrieb {
      font-size: 10pt;
      color: #475569;
      margin-top: 4px;
    }
    .sig-monteur-datum {
      font-size: 10pt;
      color: #0f172a;
      margin-top: 8px;
    }

    .legal-primary {
      margin-top: 28px;
      padding: 14px 16px;
      background: #f8fafc;
      border-radius: 6px;
      border-left: 3px solid #4f6af5;
      font-size: 9.5pt;
      color: #1e293b;
      line-height: 1.55;
      font-weight: 500;
    }
    .legal-meta {
      margin-top: 14px;
      font-size: 7.5pt;
      color: #64748b;
      line-height: 1.45;
    }

    .block { page-break-inside: auto; }
  </style>
</head>
<body>

  <div class="header">
    <div class="header-left">
      <div class="betrieb">${esc(data.betriebName)}</div>
      <div class="subtitle">Serviceprotokoll</div>
    </div>
    ${logoBlock}
  </div>

  <div class="content">
    <div class="info-grid">
      <div class="info-cell">
        <div class="info-label">Kunde</div>
        <div class="info-value">${esc(data.kundeName)}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Datum</div>
        <div class="info-value">${esc(data.datum)}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Adresse</div>
        <div class="info-value">${kundeAdresseAnzeige}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Telefon</div>
        <div class="info-value">${kundeTelefonAnzeige}</div>
      </div>
    </div>

    <div class="section block">
      <div class="section-title">Durchgeführte Arbeiten</div>
      <div class="section-content">${esc(data.kiText)}</div>
    </div>

    ${materialienBlock}
  </div>

  ${fotosPage}

  <div class="page-break"></div>
  <div class="content signature-page">
    <div class="section-title">Bestätigung &amp; Unterschrift</div>
    <div class="sig-two-col">
      <div class="sig-col">
        <div class="sig-col-title">Unterschrift Kunde</div>
        ${kundeSigBlock}
        <hr class="hline" />
        <div class="sig-field-label">Name in Druckbuchstaben:</div>
        <div class="sig-field-value">${esc(data.kundeName)}</div>
        <div class="sig-field-label">Datum:</div>
        <div class="sig-field-value">${esc(data.datum)}</div>
      </div>
      <div class="sig-col sig-monteur-block">
        <div class="sig-col-title">Monteur</div>
        ${monteurSigBlock}
        <hr class="hline" />
        <div class="sig-monteur-name">${monteurNameEsc}</div>
        <div class="sig-monteur-betrieb">${esc(data.betriebName)}</div>
        <div class="sig-field-label">Datum:</div>
        <div class="sig-monteur-datum">${esc(data.datum)}</div>
      </div>
    </div>
    <div class="legal-primary">
      Mit meiner Unterschrift bestätige ich die ordnungsgemäße Ausführung der beschriebenen Arbeiten und deren Abnahme.
    </div>
    <div class="legal-meta">${erstelltMeta}</div>
  </div>

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

    const footerBetrieb = esc(data.betriebName);
    const footerTemplate = `<div style="font-size:8pt;color:#94a3b8;text-align:center;width:100%;padding:0 14mm;font-family:system-ui,-apple-system,sans-serif;">
    ${footerBetrieb} · Serviceprotokoll · <span class="pageNumber"></span>/<span class="totalPages"></span>
  </div>`;

    const pdfUint8 = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate,
      margin: { top: "14mm", bottom: "20mm", left: "14mm", right: "14mm" },
    });

    const buffer = Buffer.from(pdfUint8);
    const outPath = join(getPdfsUploadDir(), `${data.protokollId}.pdf`);
    await writeFile(outPath, buffer);
    return buffer;
  } finally {
    await browser.close();
  }
}
