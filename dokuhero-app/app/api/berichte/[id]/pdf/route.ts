import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { renderBerichtPdf, saveBerichtPdf } from "@/lib/pdf";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

type Ctx = { params: { id: string } };

function deDate(v: unknown): string {
  const d = v instanceof Date ? v : new Date(String(v) + "T12:00:00");
  if (Number.isNaN(d.getTime())) return String(v ?? "");
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
}

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    const uid = Number(session?.user?.id);
    if (!session?.user?.id || !Number.isFinite(uid)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT b.id, b.title, b.formatted_text, b.report_date,
              bs.name AS baustelle_name, bs.address, bs.customer_name
       FROM berichte b
       INNER JOIN baustellen bs ON bs.id = b.baustelle_id
       WHERE b.id = ? AND bs.user_id = ? LIMIT 1`,
      [id, uid]
    );
    const row = rows[0] as
      | {
          id: number;
          title: string;
          formatted_text: string | null;
          report_date: unknown;
          baustelle_name: string;
          address: string | null;
          customer_name: string | null;
        }
      | undefined;
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const ft = row.formatted_text?.trim() ?? "";
    if (!ft) return NextResponse.json({ error: "Zuerst formulieren." }, { status: 400 });
    const [fr] = await pool.execute<RowDataPacket[]>(
      "SELECT file_path FROM bericht_fotos WHERE bericht_id = ? ORDER BY sort_order ASC, id ASC",
      [id]
    );
    const paths = fr.map((x) => String((x as { file_path: string }).file_path));
    const buf = await renderBerichtPdf({
      berichtId: id,
      baustelleName: row.baustelle_name,
      baustelleAddress: row.address,
      customerName: row.customer_name,
      reportTitle: row.title,
      reportDateDe: deDate(row.report_date),
      formattedText: ft,
      fotoWebPaths: paths,
    });
    const pdfPath = await saveBerichtPdf(id, buf);
    await pool.execute(
      `UPDATE berichte SET pdf_path = ?, status = 'pdf_generated' WHERE id = ?`,
      [pdfPath, id]
    );
    return NextResponse.json({ ok: true, pdf_path: pdfPath });
  } catch (e) {
    console.error(e);
    const m = e instanceof Error ? e.message : "PDF-Fehler";
    return NextResponse.json({ error: m }, { status: 500 });
  }
}
