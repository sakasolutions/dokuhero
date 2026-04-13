import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { generateBerichtPdfBuffer, writeBerichtPdfFile } from "@/lib/pdf";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

type Ctx = { params: { id: string } };

function reportDateDe(v: unknown): string {
  const d = v instanceof Date ? v : new Date(String(v) + "T12:00:00");
  if (Number.isNaN(d.getTime())) return String(v ?? "");
  return d.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function POST(_request: Request, context: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    const userId = Number(session?.user?.id);
    if (!session?.user?.id || !Number.isFinite(userId)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const id = Number(context.params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT b.id, b.report_date, b.formatted_text, b.status,
              bs.name AS baustelle_name, bs.address AS baustelle_address
       FROM berichte b
       INNER JOIN baustellen bs ON bs.id = b.baustelle_id
       WHERE b.id = ? AND bs.user_id = ?
       LIMIT 1`,
      [id, userId]
    );
    const row = rows[0] as
      | {
          id: number;
          report_date: unknown;
          formatted_text: string | null;
          status: string;
          baustelle_name: string;
          baustelle_address: string | null;
        }
      | undefined;
    if (!row) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const text = row.formatted_text?.trim() ?? "";
    if (!text) {
      return NextResponse.json(
        { error: "Zuerst formulieren (kein Text)." },
        { status: 400 }
      );
    }

    const [frows] = await pool.execute<RowDataPacket[]>(
      "SELECT file_path FROM bericht_fotos WHERE bericht_id = ? ORDER BY id ASC",
      [id]
    );
    const fotoWebPaths = frows.map((f) => String((f as { file_path: string }).file_path));

    const buffer = await generateBerichtPdfBuffer({
      berichtId: id,
      baustelleName: row.baustelle_name,
      baustelleAddress: row.baustelle_address,
      reportDateDe: reportDateDe(row.report_date),
      formattedText: text,
      fotoWebPaths,
    });

    const pdfPath = await writeBerichtPdfFile(id, buffer);

    await pool.execute(
      `UPDATE berichte SET pdf_path = ?, status = 'pdf_generated' WHERE id = ?`,
      [pdfPath, id]
    );

    return NextResponse.json({ ok: true, pdf_path: pdfPath });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "PDF fehlgeschlagen.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
