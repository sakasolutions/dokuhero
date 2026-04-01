import { mkdir } from "fs/promises";
import { basename, join } from "path";

export function getFotosUploadDir(): string {
  if (process.env.FOTOS_UPLOAD_DIR?.trim()) {
    return process.env.FOTOS_UPLOAD_DIR.trim();
  }
  return join(process.cwd(), "public", "uploads", "fotos");
}

/**
 * Absoluter Pfad für PDF-Generierung aus Web-Pfad `/uploads/fotos/{dateiname}`.
 * Reihenfolge: FOTOS_UPLOAD_DIR → DOKUHERO_PUBLIC_DIR → cwd/public
 */
export function resolveFotoDiskPathFromWebPath(webPath: string): string {
  const p = webPath.trim();
  const rel = p.startsWith("/") ? p.slice(1) : p;

  if (process.env.FOTOS_UPLOAD_DIR?.trim()) {
    const dir = process.env.FOTOS_UPLOAD_DIR.trim();
    const name =
      /^uploads\/fotos\//i.test(rel) ? basename(rel) : basename(p);
    return join(dir, name);
  }

  const publicRoot = process.env.DOKUHERO_PUBLIC_DIR?.trim();
  if (publicRoot) {
    return join(publicRoot, rel);
  }

  return join(process.cwd(), "public", rel);
}

export async function ensureFotosUploadDir(): Promise<string> {
  const dir = getFotosUploadDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

export function getPdfsUploadDir(): string {
  return join(process.cwd(), "public", "uploads", "pdfs");
}

export async function ensurePdfsUploadDir(): Promise<string> {
  const dir = getPdfsUploadDir();
  await mkdir(dir, { recursive: true });
  return dir;
}
