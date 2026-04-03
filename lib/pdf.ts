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
  datum: string;
  /** z. B. Auftrags-ID */
  auftragsnummer: string;
  /** Laufende Nr. je Auftrag; PDF-Zeile „Protokoll“ nur wenn gesetzt */
  protokoll_nummer?: number | null;
  beschreibung: string;
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
      const imageBuffer = await readFile(diskPath);
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
      ? `<div class="logo-wrap has-logo"><img src=${JSON.stringify(logoDataUri)} alt="" /></div>`
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

  const fotosBlock =
    fotoDataUris.length > 0
      ? `
    <div class="section block">
      <div class="section-title">Fotodokumentation</div>
      <div class="foto-grid">${fotoCells}</div>
    </div>`
      : "";

  const protokollInfoValue =
    data.protokoll_nummer != null &&
    Number.isFinite(Number(data.protokoll_nummer))
      ? `#${esc(String(data.protokoll_nummer))}`
      : "–";

  const unterschriftInner = data.unterschriftDataUri?.trim()
    ? `
        <div class="unterschrift-box">
          <img src=${JSON.stringify(data.unterschriftDataUri.trim())} alt="Unterschrift" />
          <div class="unterschrift-meta">
            Digitale Unterschrift des Kunden · ${esc(data.datum)}
          </div>
        </div>
      `
    : `
        <div style="margin-top: 12px;">
          <div class="unterschrift-linie"></div>
          <div class="unterschrift-label">Unterschrift Kunde / Datum</div>
        </div>
      `;

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

    /* HEADER */
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
    .logo-wrap.has-logo img {
      filter: brightness(0) invert(1);
    }

    /* CONTENT WRAPPER */
    .content { padding: 28px 32px; }

    /* INFO BLOCK */
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

    /* SECTIONS */
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

    /* MATERIALIEN als Liste */
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
      align-items: center;
      gap: 8px;
    }
    .materialien-list li:last-child { border-bottom: none; }
    .materialien-list li::before {
      content: "·";
      color: #94a3b8;
      font-weight: 700;
    }

    /* FOTOS */
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

    /* UNTERSCHRIFT */
    .unterschrift-section {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 2px solid #e2e8f0;
      page-break-inside: avoid;
    }
    .unterschrift-box {
      margin-top: 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px;
      background: #ffffff;
      max-width: 400px;
    }
    .unterschrift-box img {
      max-height: 100px;
      max-width: 100%;
      display: block;
    }
    .unterschrift-meta {
      margin-top: 8px;
      font-size: 8.5pt;
      color: #64748b;
    }
    .unterschrift-linie {
      border-top: 1px solid #1e293b;
      width: 280px;
      margin-top: 60px;
      margin-bottom: 6px;
    }
    .unterschrift-label {
      font-size: 8.5pt;
      color: #64748b;
    }

    /* RECHTLICHER HINWEIS */
    .legal-note {
      margin-top: 20px;
      padding: 10px 14px;
      background: #f8fafc;
      border-radius: 6px;
      border-left: 3px solid #4f6af5;
      font-size: 8pt;
      color: #64748b;
      line-height: 1.5;
    }

    /* SEITENUMBRUCH */
    .block { page-break-inside: auto; }
    h2 { page-break-after: avoid; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <div class="betrieb">${esc(data.betriebName)}</div>
      <div class="subtitle">Serviceprotokoll</div>
    </div>
    ${logoBlock}
  </div>

  <div class="content">

    <!-- INFO GRID: Kunde, Datum, Auftrag, Protokoll -->
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
        <div class="info-label">Auftragsnummer</div>
        <div class="info-value">${esc(data.auftragsnummer)}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Protokoll</div>
        <div class="info-value">${protokollInfoValue}</div>
      </div>
    </div>

    <!-- DURCHGEFÜHRTE ARBEITEN -->
    <div class="section block">
      <div class="section-title">Durchgeführte Arbeiten</div>
      <div class="section-content">${esc(data.kiText)}</div>
    </div>

    ${materialienBlock}

    ${fotosBlock}

    <!-- UNTERSCHRIFT -->
    <div class="unterschrift-section">
      <div class="section-title">Bestätigung & Unterschrift</div>
      ${unterschriftInner}
    </div>

    <!-- RECHTLICHER HINWEIS -->
    <div class="legal-note">
      Dieses Protokoll wurde digital erstellt und dokumentiert die durchgeführten
      Arbeiten zum angegebenen Datum. Mit der Unterschrift bestätigt der Kunde
      die ordnungsgemäße Ausführung der beschriebenen Leistungen.
      Erstellt mit DokuHero · ${esc(data.betriebName)}
    </div>

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
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate,
      margin: { top: "14mm", bottom: "20mm", left: "14mm", right: "14mm" },
    });

    const buffer = Buffer.from(pdfUint8);
    // TODO: Dateiname konfigurierbar über Betriebseinstellungen (Anhang-E-Mails nutzen derzeit separat „protokoll.pdf“).
    const outPath = join(getPdfsUploadDir(), `${data.protokollId}.pdf`);
    await writeFile(outPath, buffer);
    return buffer;
  } finally {
    await browser.close();
  }
}
