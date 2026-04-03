import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const pathname = request.nextUrl.pathname;

  // Public paths - immer erlaubt
  if (
    pathname === "/" ||
    pathname === "/impressum" ||
    pathname === "/datenschutz" ||
    pathname === "/agb"
  ) {
    return NextResponse.next();
  }

  const publicPaths = [
    "/login",
    "/register",
    "/api/register",
    "/preise",
    "/api/stripe",
    "/api/auth",
    "/api/cron",
    "/passwort-vergessen",
    "/passwort-reset",
    "/bewertung",
    "/gesperrt",
    "/_next",
    "/favicon",
    "/images",
    "/uploads",
  ];

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));
  if (isPublicPath) return NextResponse.next();

  // Nicht eingeloggt
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Admin darf immer rein
  if (token.email === process.env.ADMIN_EMAIL) {
    return NextResponse.next();
  }

  // Mitarbeiter dürfen NICHT auf Admin-Bereich
  if (
    (token as any).rolle === "mitarbeiter" &&
    pathname.startsWith("/admin")
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Gesperrt check
  if (token.gesperrt === 1) {
    return NextResponse.redirect(new URL("/gesperrt", request.url));
  }

  // Trial/Plan check
  const plan = (token.plan as string) || "trial";
  const registriertAm = token.registriert_am
    ? new Date(token.registriert_am as string)
    : new Date();

  const trialEnde = new Date(
    registriertAm.getTime() + 30 * 24 * 60 * 60 * 1000
  );
  const jetzt = new Date();

  const trialAbgelaufen = plan === "trial" && jetzt > trialEnde;
  const expired = plan === "expired";

  if (trialAbgelaufen || expired) {
    return NextResponse.redirect(new URL("/preise", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
