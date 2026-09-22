import { PageCompanion } from "@/components/nailong-companion";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/layout/app-header";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  return (
    <div className="min-h-screen pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-10">
      <AppHeader profile={profile} />
      {children}
      <PageCompanion />
      <MobileNav profile={profile} />
    </div>
  );
}
