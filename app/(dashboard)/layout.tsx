import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.betrieb_id) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="h-screen w-60 flex-shrink-0 overflow-y-auto bg-slate-900">
        <Sidebar />
      </aside>

      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bg-surface lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
