import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import puppeteer from "puppeteer";
import { ensureBerichtPdfsDir, resolvePublicFilePath } from "@/lib/uploads";

export type BerichtPdfInput = {
  berichtId: number;
  baustelleName: string;
  baustelleAddress: string | null;
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

function bufferToDataUri(buf: Buffer): string {
  const b64 = buf.toString("base64");
  const isPng = buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50;
  return isPng
    ? `data:image/png;base64,${b64}`
    : `data:image/jpeg;base64,${b64}`;
}

async function loadFotoDataUris(webPaths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const p of webPaths.slice(0, 10)) {
    try {
      const disk = resolvePublicFilePath(p);
      const buf = await readFile(disk);
      out.push(bufferToDataUri(buf));
    } catch {
      console.error("PDF: Foto übersprungen:", p);
    }
  }
  return out;
}

function buildHtml(data: BerichtPdfInput, fotoUris: string[]): string {
  const addr = data.baustelleAddress?.trim() ? esc(data.baustelleAddress.trim()) : "–";
  const lines = data.formattedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<p style="margin:0 0 6px;">${esc(l)}</p>`)
    .join("");
  const fotos =
    fotoUris.length > 0
      ? `<div style="margin-top:20px;"><div style="font-size:9pt;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px;">Fotos</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">${fotoUris
          .map(
            (src) =>
              `<div style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;aspect-ratio:4/3;"><img src=${JSON.stringify(src)} alt="" style="width:100%;height:100%;object-fit:cover;" /></div>`
          )
          .join("")}</div></div>`
      : "";

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8" /></head>
<body style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:11pt;color:#0f172a;">
  <div style="background:#1e293b;color:#fff;padding:20px 24px;">
    <div style="font-size:16pt;font-weight:700;">${esc(data.baustelleName)}</div>
    <div style="font-size:9pt;color:#94a3b8;margin-top:4px;">Bericht · ${esc(data.reportDateDe)}</div>
  </div>
  <div style="padding:24px;">
    <div style="font-size:9pt;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px;">Adresse</div>
    <div style="margin-bottom:20px;">${addr}</div>
    <div style="font-size:9pt;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px;">Dokumentation</div>
    <div>${lines || `<p style="color:#64748b;">–</p>`}</div>
    ${fotos}
  </div>
</body>
</html>`;
}

export async function generateBerichtPdfBuffer(
  data: BerichtPdfInput
): Promise<Buffer> {
  const fotoUris = await loadFotoDataUris(data.fotoWebPaths);
  const html = buildHtml(data, fotoUris);

  const launchOpts: Parameters<typeof puppeteer.launch>[0] = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  };
  if (process.env.PUPPETEER_EXECUTABLE_PATH?.trim()) {
    launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH.trim();
  }

  const browser = await puppeteer.launch(launchOpts);
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const pdfUint8 = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "14mm", left: "12mm", right: "12mm" },
    });
    return Buffer.from(pdfUint8);
  } finally {
    await browser.close();
  }
}

export async function writeBerichtPdfFile(
  berichtId: number,
  buffer: Buffer
): Promise<string> {
  const dir = await ensureBerichtPdfsDir();
  const name = `${berichtId}.pdf`;
  const full = join(dir, name);
  await writeFile(full, buffer);
  return `/uploads/bericht-pdfs/${name}`;
}
