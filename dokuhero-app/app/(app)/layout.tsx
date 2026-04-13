import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { LogoutButton } from "@/components/baustellen/LogoutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/baustellen" className="text-lg font-bold text-slate-900">
            DokuHero
          </Link>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">{s.user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8">{children}</div>
    </div>
  );
}
