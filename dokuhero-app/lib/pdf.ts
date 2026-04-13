import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import puppeteer from "puppeteer";
import { diskFromWeb, ensurePdfsDir, webPdf } from "@/lib/uploads";

export type BerichtPdfData = {
  berichtId: number;
  baustelleName: string;
  baustelleAddress: string | null;
  customerName: string | null;
  reportTitle: string;
  reportDateDe: string;
  formattedText: string;
  fotoWebPaths: string[];
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toDataUri(buf: Buffer): string {
  const b64 = buf.toString("base64");
  const png = buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50;
  return png ? `data:image/png;base64,${b64}` : `data:image/jpeg;base64,${b64}`;
}

async function fotoUris(paths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const p of paths.slice(0, 12)) {
    try {
      out.push(toDataUri(await readFile(diskFromWeb(p))));
    } catch {
      console.error("PDF Foto:", p);
    }
  }
  return out;
}

function html(d: BerichtPdfData, uris: string[]): string {
  const paragraphs = d.formattedText
    .split(/\r?\n\r?\n|\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const inner = lines.map((l) => esc(l)).join("<br/>");
      return `<p class="para">${inner}</p>`;
    })
    .join("");

  const metaRows: string[] = [];
  if (d.customerName?.trim()) {
    metaRows.push(
      `<tr><th>Kunde / Ansprechort</th><td>${esc(d.customerName.trim())}</td></tr>`
    );
  }
  metaRows.push(
    `<tr><th>Adresse Baustelle</th><td>${esc(d.baustelleAddress?.trim() || "–")}</td></tr>`
  );

  const fotoBlock =
    uris.length > 0
      ? `<section class="section"><h2 class="h2">Fotos</h2><div class="grid">${uris
          .map(
            (u) =>
              `<figure class="fig"><div class="imgwrap"><img src=${JSON.stringify(u)} alt=""/></div></figure>`
          )
          .join("")}</div></section>`
      : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8"/>
<style>
  @page { margin: 14mm 12mm 16mm 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif;
    font-size: 10.5pt;
    line-height: 1.55;
    color: #1e293b;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet { max-width: 100%; }
  .hero {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
    color: #fff;
    padding: 22px 24px 20px;
    border-radius: 0 0 10px 10px;
  }
  .hero-kicker { font-size: 8.5pt; letter-spacing: 0.12em; text-transform: uppercase; color: #94a3b8; margin: 0 0 6px; }
  .hero-title { font-size: 17pt; font-weight: 700; margin: 0; line-height: 1.25; }
  .hero-sub { margin: 10px 0 0; font-size: 10pt; color: #cbd5e1; }
  .hero-sub strong { color: #fff; font-weight: 600; }
  .content { padding: 20px 4px 8px; }
  .meta { width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 9.5pt; }
  .meta th {
    text-align: left;
    width: 32%;
    color: #64748b;
    font-weight: 600;
    padding: 8px 12px 8px 0;
    vertical-align: top;
    border-bottom: 1px solid #e2e8f0;
  }
  .meta td {
    padding: 8px 0;
    vertical-align: top;
    border-bottom: 1px solid #e2e8f0;
  }
  .section { margin-top: 4px; }
  .h2 {
    margin: 0 0 12px;
    font-size: 9pt;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 700;
  }
  .body {
    font-size: 10.5pt;
    color: #334155;
  }
  .para { margin: 0 0 12px; }
  .para:last-child { margin-bottom: 0; }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .fig { margin: 0; }
  .imgwrap {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    background: #f8fafc;
    aspect-ratio: 4/3;
  }
  .imgwrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
</style>
</head>
<body>
<div class="sheet">
  <header class="hero">
    <p class="hero-kicker">Baustellenbericht</p>
    <h1 class="hero-title">${esc(d.reportTitle)}</h1>
    <p class="hero-sub"><strong>${esc(d.baustelleName)}</strong> · ${esc(d.reportDateDe)}</p>
  </header>
  <main class="content">
    <table class="meta" role="presentation">${metaRows.join("")}</table>
    <section class="section">
      <h2 class="h2">Berichtstext</h2>
      <div class="body">${paragraphs || `<p class="para" style="color:#94a3b8">–</p>`}</div>
    </section>
    ${fotoBlock}
  </main>
</div>
</body>
</html>`;
}

export async function renderBerichtPdf(d: BerichtPdfData): Promise<Buffer> {
  const uris = await fotoUris(d.fotoWebPaths);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    ...(process.env.PUPPETEER_EXECUTABLE_PATH?.trim()
      ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH.trim() }
      : {}),
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html(d, uris), { waitUntil: "domcontentloaded", timeout: 60_000 });
    const u8 = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "12mm", left: "12mm", right: "12mm" },
    });
    return Buffer.from(u8);
  } finally {
    await browser.close();
  }
}

export async function saveBerichtPdf(berichtId: number, buf: Buffer): Promise<string> {
  const dir = await ensurePdfsDir();
  const name = `${berichtId}.pdf`;
  await writeFile(join(dir, name), buf);
  return webPdf(berichtId);
}
