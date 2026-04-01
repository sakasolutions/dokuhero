import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "next-auth/middleware";
import { isAdminEmail } from "@/lib/admin";

async function fetchBetriebGesperrt(req: NextRequest): Promise<boolean> {
  try {
    const url = new URL("/api/betrieb-status", req.nextUrl.origin);
    const res = await fetch(url, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { gesperrt?: boolean };
    return data.gesperrt === true;
  } catch {
    return false;
  }
}

export default withAuth(
  async function middleware(req) {
    const path = req.nextUrl.pathname;
    const token = req.nextauth.token;

    if (path === "/gesperrt" || path.startsWith("/gesperrt/")) {
      return NextResponse.next();
    }

    if (path === "/admin" || path.startsWith("/admin/")) {
      if (!isAdminEmail(token?.email as string | undefined)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.next();
    }

    const email = token?.email as string | undefined;
    if (isAdminEmail(email)) {
      return NextResponse.next();
    }

    if (token?.betrieb_id && (await fetchBetriebGesperrt(req))) {
      return NextResponse.redirect(new URL("/gesperrt", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;
        if (path === "/gesperrt" || path.startsWith("/gesperrt/")) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/kunden/:path*",
    "/auftraege",
    "/auftraege/:path*",
    "/protokoll",
    "/protokoll/:path*",
    "/einstellungen",
    "/einstellungen/:path*",
    "/admin",
    "/admin/:path*",
    "/gesperrt",
  ],
};
