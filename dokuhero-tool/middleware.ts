import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = token ? "/baustellen" : "/login";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/login")) {
    if (token) {
      const url = request.nextUrl.clone();
      url.pathname = "/baustellen";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!token && (pathname.startsWith("/baustellen") || pathname.startsWith("/berichte"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const protectedApi =
    pathname.startsWith("/api/baustellen") ||
    pathname.startsWith("/api/berichte") ||
    pathname.startsWith("/api/whisper");
  if (!token && protectedApi) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};
