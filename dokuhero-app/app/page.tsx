import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function RootPage() {
  const s = await getServerSession(authOptions);
  redirect(s?.user?.id ? "/baustellen" : "/login");
}
