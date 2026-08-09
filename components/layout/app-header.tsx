import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Camera, Home, ShieldCheck, ShoppingBag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Profile } from "@/types/database";
import { MediaImage } from "@/components/ui/media-image";
import { getPublicImageUrl } from "@/lib/utils";

const desktopItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "首页", icon: Home },
  { href: "/checkin", label: "签到", icon: Camera },
  { href: "/shop", label: "商店", icon: ShoppingBag },
  { href: "/calendar", label: "日历", icon: CalendarDays },
];

export function AppHeader({ profile }: { profile: Profile }) {
  const avatar = getPublicImageUrl("avatars", profile.avatar_url);
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/85 backdrop-blur-xl">
      <div className="page-shell flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-tight text-brown">
          <Image src="/nailong/nailong-3d.png" alt="" width={34} height={34} className="size-9 object-contain" />
          <span>Jj的快乐小屋</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="桌面导航">
          {desktopItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted transition hover:bg-amber-100 hover:text-brown">
              <Icon className="size-4 text-nailong-deep" />{label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          {profile.role === "admin" && (
            <Link href="/admin" className="hidden items-center gap-1.5 rounded-full bg-brown px-3 py-1.5 text-xs font-semibold text-white sm:flex">
              <ShieldCheck className="size-3.5" />管理后台
            </Link>
          )}
          <Link href="/profile" aria-label="个人中心">
            <MediaImage src={avatar} alt={profile.nickname} className="size-10 rounded-full border-2 border-white shadow-sm" />
          </Link>
        </div>
      </div>
    </header>
  );
}
