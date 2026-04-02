import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { withAuth } from "next-auth/middleware";
import { isAdminEmail } from "@/lib/admin";

export default withAuth(
  async function middleware(req) {
    const path = req.nextUrl.pathname;

    if (path === "/gesperrt" || path.startsWith("/gesperrt/")) {
      return NextResponse.next();
    }

    if (path === "/preise" || path.startsWith("/preise/")) {
      return NextResponse.next();
    }

    const secret = process.env.NEXTAUTH_SECRET;
    const token = secret ? await getToken({ req, secret }) : null;

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

    if (Number(token?.gesperrt) === 1) {
      return NextResponse.redirect(new URL("/gesperrt", req.url));
    }

    // Trial- / Plan-Gating
    const plan = (token as unknown as { plan?: unknown }).plan;
    const planStr = typeof plan === "string" ? plan : null;
    if (planStr === "expired") {
      return NextResponse.redirect(new URL("/preise", req.url));
    }
    if (planStr === "trial") {
      const createdIso = (token as unknown as { erstellt_am?: unknown }).erstellt_am;
      const createdAt =
        typeof createdIso === "string" ? new Date(createdIso) : null;
      if (createdAt && !Number.isNaN(createdAt.getTime())) {
        const days30 = 30 * 24 * 60 * 60 * 1000;
        if (Date.now() - createdAt.getTime() > days30) {
          return NextResponse.redirect(new URL("/preise", req.url));
        }
      }
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
        if (path === "/preise" || path.startsWith("/preise/")) {
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
    "/preise",
    "/preise/:path*",
    "/admin",
    "/admin/:path*",
    "/gesperrt",
  ],
};
