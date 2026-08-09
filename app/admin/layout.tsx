import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/layout/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <div className="min-h-screen"><div className="page-shell py-5 sm:py-8"><div className="mb-6"><p className="text-xs font-bold uppercase tracking-wider text-nailong-deep">Admin space</p><h1 className="mt-1 text-2xl font-black text-brown">奶龙管理后台</h1></div><div className="grid gap-6 lg:grid-cols-[auto_1fr]"><AdminNav /><main className="min-w-0">{children}</main></div></div></div>;
}
