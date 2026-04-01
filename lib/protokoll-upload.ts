import { mkdir } from "fs/promises";
import { join } from "path";

export function getFotosUploadDir(): string {
  return join(process.cwd(), "public", "uploads", "fotos");
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
