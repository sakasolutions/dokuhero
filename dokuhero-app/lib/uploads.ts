import { mkdir } from "fs/promises";
import { join } from "path";

export const DIR_BERICHT_FOTOS = "uploads/bericht-fotos";
export const DIR_BERICHT_PDFS = "uploads/bericht-pdfs";

export function getPublicRoot(): string {
  const e = process.env.PUBLIC_UPLOAD_ROOT?.trim();
  return e || join(process.cwd(), "public");
}

export function webFoto(name: string): string {
  return `/${DIR_BERICHT_FOTOS}/${name}`;
}

export function webPdf(berichtId: number): string {
  return `/${DIR_BERICHT_PDFS}/${berichtId}.pdf`;
}

export async function ensureFotosDir(): Promise<string> {
  const d = join(getPublicRoot(), DIR_BERICHT_FOTOS);
  await mkdir(d, { recursive: true });
  return d;
}

export async function ensurePdfsDir(): Promise<string> {
  const d = join(getPublicRoot(), DIR_BERICHT_PDFS);
  await mkdir(d, { recursive: true });
  return d;
}

export function diskFromWeb(webPath: string): string {
  const rel = webPath.replace(/^\//, "");
  return join(getPublicRoot(), rel);
}
