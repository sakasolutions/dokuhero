import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "nicht eingeloggt" }, { status: 401 });
  return NextResponse.json({
    rolle: session.user.rolle,
    benutzer_id: session.user.benutzer_id,
    name: session.user.name,
  });
}
