import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { NextResponse } from "next/server";

// PATCH — Mitarbeiter aktivieren/deaktivieren
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.betrieb_id) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }
  if (session.user.rolle !== "inhaber") {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const body = await req.json();
  const { aktiv } = body;

  const pool = getPool();

  // Sicherstellen dass der Benutzer zum Betrieb gehört
  const [rows] = await pool.execute(
    `SELECT id, rolle FROM benutzer 
     WHERE id = ? AND betrieb_id = ?`,
    [params.id, session.user.betrieb_id]
  );

  if ((rows as any[]).length === 0) {
    return NextResponse.json(
      { error: "Benutzer nicht gefunden" },
      { status: 404 }
    );
  }

  // Inhaber kann nicht deaktiviert werden
  if ((rows as any[])[0].rolle === "inhaber") {
    return NextResponse.json(
      { error: "Inhaber kann nicht deaktiviert werden" },
      { status: 403 }
    );
  }

  await pool.execute(
    `UPDATE benutzer SET aktiv = ? WHERE id = ? AND betrieb_id = ?`,
    [aktiv ? 1 : 0, params.id, session.user.betrieb_id]
  );

  return NextResponse.json({ ok: true });
}

// DELETE — Mitarbeiter löschen
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.betrieb_id) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }
  if (session.user.rolle !== "inhaber") {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const pool = getPool();

  // Sicherstellen dass der Benutzer zum Betrieb gehört
  const [rows] = await pool.execute(
    `SELECT id, rolle FROM benutzer 
     WHERE id = ? AND betrieb_id = ?`,
    [params.id, session.user.betrieb_id]
  );

  if ((rows as any[]).length === 0) {
    return NextResponse.json(
      { error: "Benutzer nicht gefunden" },
      { status: 404 }
    );
  }

  // Inhaber kann nicht gelöscht werden
  if ((rows as any[])[0].rolle === "inhaber") {
    return NextResponse.json(
      { error: "Inhaber kann nicht gelöscht werden" },
      { status: 403 }
    );
  }

  await pool.execute(
    `DELETE FROM benutzer WHERE id = ? AND betrieb_id = ?`,
    [params.id, session.user.betrieb_id]
  );

  return NextResponse.json({ ok: true });
}
