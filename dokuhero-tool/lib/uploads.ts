import { mkdir } from "fs/promises";
import { basename, join } from "path";

/** Relativ zu `public/` */
export const UPLOAD_BERICHT_FOTOS = "uploads/bericht-fotos";
export const UPLOAD_BERICHT_PDFS = "uploads/bericht-pdfs";

export function getPublicDir(): string {
  const fromEnv = process.env.PUBLIC_UPLOAD_ROOT?.trim();
  if (fromEnv) return fromEnv;
  return join(process.cwd(), "public");
}

export function webPathBerichtFoto(filename: string): string {
  return `/${UPLOAD_BERICHT_FOTOS}/${filename}`;
}

export function webPathBerichtPdf(berichtId: number | bigint): string {
  return `/${UPLOAD_BERICHT_PDFS}/${berichtId}.pdf`;
}

export async function ensureBerichtFotosDir(): Promise<string> {
  const dir = join(getPublicDir(), UPLOAD_BERICHT_FOTOS);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function ensureBerichtPdfsDir(): Promise<string> {
  const dir = join(getPublicDir(), UPLOAD_BERICHT_PDFS);
  await mkdir(dir, { recursive: true });
  return dir;
}

/** Web-Pfad `/uploads/...` → absoluter Dateipfad auf der Platte */
export function resolvePublicFilePath(webPath: string): string {
  const p = webPath.trim().replace(/^\//, "");
  return join(getPublicDir(), p);
}

export function basenameFromWebPath(webPath: string): string {
  return basename(webPath.trim());
}
