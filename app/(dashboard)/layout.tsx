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
    <div
      className="flex overflow-hidden"
      style={{ display: "flex", height: "100vh", overflow: "hidden" }}
    >
      <aside
        className="hidden flex-col border-r border-white/10 bg-slate-900 lg:flex"
        style={{
          width: 240,
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          overflow: "hidden",
          zIndex: 40,
        }}
      >
        <Sidebar />
      </aside>

      <div
        className="ml-0 flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden lg:ml-[240px]"
        style={{ flex: 1, height: "100vh" }}
      >
        <Navbar />
        <main
          className="min-h-0 flex-1 overflow-y-auto bg-slate-50 lg:bg-surface"
          style={{ flex: 1, overflowY: "auto" }}
        >
          <div className="mx-auto max-w-4xl p-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-6">
            {children}
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
