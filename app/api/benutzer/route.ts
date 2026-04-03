import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// GET — alle Mitarbeiter des Betriebs laden
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.betrieb_id) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }
  if (session.user.rolle !== "inhaber") {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT id, name, email, username, rolle, aktiv, erstellt_am
     FROM benutzer
     WHERE betrieb_id = ?
     ORDER BY erstellt_am ASC`,
    [session.user.betrieb_id]
  );

  return NextResponse.json(rows);
}

// POST — neuen Mitarbeiter anlegen
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.betrieb_id) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }
  if (session.user.rolle !== "inhaber") {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const body = await req.json();
  const { name, username, passwort } = body;

  if (!name || !username || !passwort) {
    return NextResponse.json(
      { error: "Name, Username und Passwort sind Pflichtfelder" },
      { status: 400 }
    );
  }

  if (passwort.length < 6) {
    return NextResponse.json(
      { error: "Passwort muss mindestens 6 Zeichen haben" },
      { status: 400 }
    );
  }

  const pool = getPool();

  // Username bereits vergeben?
  const [existing] = await pool.execute(
    `SELECT id FROM benutzer 
     WHERE username = ? AND betrieb_id = ?`,
    [username.trim().toLowerCase(), session.user.betrieb_id]
  );
  if ((existing as any[]).length > 0) {
    return NextResponse.json(
      { error: "Username bereits vergeben" },
      { status: 409 }
    );
  }

  const hash = await bcrypt.hash(passwort, 12);

  await pool.execute(
    `INSERT INTO benutzer (betrieb_id, name, username, passwort, rolle, aktiv)
     VALUES (?, ?, ?, ?, 'mitarbeiter', 1)`,
    [session.user.betrieb_id, name.trim(), username.trim().toLowerCase(), hash]
  );

  return NextResponse.json({ ok: true });
}
