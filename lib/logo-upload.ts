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
 * Liest Logo-Datei von derselben Stelle wie der Upload (wichtig mit LOGO_UPLOAD_DIR).
 * `webPath` z. B. `/uploads/logos/42.jpg`.
 */
export function resolveLogoDiskPathFromWebPath(webPath: string): string {
  const p = webPath.trim();
  const m = /^\/uploads\/logos\/(\d+)\.jpg$/i.exec(p);
  if (m && process.env.LOGO_UPLOAD_DIR?.trim()) {
    return join(process.env.LOGO_UPLOAD_DIR.trim(), `${m[1]}.jpg`);
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
