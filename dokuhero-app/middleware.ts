import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  if (pathname === "/") {
    const u = req.nextUrl.clone();
    u.pathname = token ? "/baustellen" : "/login";
    return NextResponse.redirect(u);
  }

  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    if (token && pathname.startsWith("/login")) {
      const u = req.nextUrl.clone();
      u.pathname = "/baustellen";
      return NextResponse.redirect(u);
    }
    return NextResponse.next();
  }

  const need =
    pathname.startsWith("/baustellen") ||
    pathname.startsWith("/berichte") ||
    pathname.startsWith("/api/baustellen") ||
    pathname.startsWith("/api/berichte") ||
    pathname.startsWith("/api/whisper");

  if (need && !token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }
    const u = req.nextUrl.clone();
    u.pathname = "/login";
    return NextResponse.redirect(u);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};
