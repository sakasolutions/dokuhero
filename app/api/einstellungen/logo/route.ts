import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import {
  ensureLogosUploadDir,
  getLogoPublicPath,
  getLogosUploadDir,
} from "@/lib/logo-upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  /** Base64 ohne Prefix oder komplette data-URL */
  base64: z.string().min(1, "base64 fehlt"),
});

const MAX_BYTES = 2_500_000;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }
    if (session.user.rolle !== "inhaber") {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    let b64 = parsed.data.base64.trim();
    const dataUrlMatch = /^data:image\/[\w+.-]+;base64,(.+)$/i.exec(b64);
    if (dataUrlMatch) {
      b64 = dataUrlMatch[1];
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(b64, "base64");
    } catch {
      return NextResponse.json(
        { error: "Ungültige Base64-Daten." },
        { status: 400 }
      );
    }

    if (buffer.length === 0 || buffer.length > MAX_BYTES) {
      return NextResponse.json(
        { error: "Bild zu groß oder leer (max. ca. 2,5 MB)." },
        { status: 400 }
      );
    }

    const betriebId = session.user.betrieb_id;
    await ensureLogosUploadDir();
    const filePath = join(getLogosUploadDir(), `${betriebId}.jpg`);
    await writeFile(filePath, buffer);

    const logo_pfad = getLogoPublicPath(betriebId);
    const pool = getPool();
    await pool.execute(`UPDATE betriebe SET logo_pfad = ? WHERE id = ?`, [
      logo_pfad,
      betriebId,
    ]);

    return NextResponse.json({ ok: true, logo_pfad });
  } catch (e) {
    console.error("POST logo:", e);
    return NextResponse.json(
      { error: "Logo-Upload fehlgeschlagen." },
      { status: 500 }
    );
  }
}
