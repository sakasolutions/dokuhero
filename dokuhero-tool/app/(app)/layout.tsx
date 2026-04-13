import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader email={session.user.email} />
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
