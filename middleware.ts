export { default } from "next-auth/middleware";

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
  ],
};
