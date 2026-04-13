import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { getServerSession } from "next-auth";
import { Providers } from "@/components/providers";
import { authOptions } from "@/lib/auth";
import "./globals.css";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "DokuHero",
  description: "Baustellendokumentation",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="de" className={font.variable}>
      <body className={`${font.variable} min-h-screen bg-slate-50 font-sans text-slate-900 antialiased`}>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
