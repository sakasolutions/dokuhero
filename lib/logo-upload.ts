import { mkdir } from "fs/promises";
import { join } from "path";

/** Produktion: z. B. `/var/www/dokuhero/public/uploads/logos` – sonst `public/uploads/logos` im Projekt. */
export function getLogosUploadDir(): string {
  if (process.env.LOGO_UPLOAD_DIR?.trim()) {
    return process.env.LOGO_UPLOAD_DIR.trim();
  }
  return join(process.cwd(), "public", "uploads", "logos");
}

/**
 * Absoluter Dateipfad für PDF/Puppeteer aus Web-Pfad `/uploads/logos/{id}.jpg`.
 * Reihenfolge: LOGO_UPLOAD_DIR → DOKUHERO_PUBLIC_DIR (z. B. /var/www/dokuhero/public) → cwd/public
 */
export function resolveLogoDiskPathFromWebPath(webPath: string): string {
  const p = webPath.trim();
  const m = /^\/uploads\/logos\/(\d+)\.jpg$/i.exec(p);
  if (m) {
    const id = m[1];
    if (process.env.LOGO_UPLOAD_DIR?.trim()) {
      return join(process.env.LOGO_UPLOAD_DIR.trim(), `${id}.jpg`);
    }
    const publicRoot = process.env.DOKUHERO_PUBLIC_DIR?.trim();
    if (publicRoot) {
      return join(publicRoot, "uploads", "logos", `${id}.jpg`);
    }
    return join(process.cwd(), "public", "uploads", "logos", `${id}.jpg`);
  }
  const rel = p.startsWith("/") ? p.slice(1) : p;
  return join(process.cwd(), "public", rel);
}

export async function ensureLogosUploadDir(): Promise<string> {
  const dir = getLogosUploadDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

/** Öffentlicher Pfad für DB und `<img src>`. */
export function getLogoPublicPath(betriebId: number): string {
  return `/uploads/logos/${betriebId}.jpg`;
}
