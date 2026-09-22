import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { DesktopNav } from "@/components/layout/desktop-nav";
import type { Profile } from "@/types/database";
import { MediaImage } from "@/components/ui/media-image";
import { getPublicImageUrl } from "@/lib/utils";

export function AppHeader({ profile }: { profile: Profile }) {
  const avatar = getPublicImageUrl("avatars", profile.avatar_url);
  return (
    <header className="app-header sticky top-0 z-40 border-b border-line/70 bg-cream/85 backdrop-blur-xl">
      <div className="page-shell flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-tight text-brown">
          <Image src="/nailong/nailong-3d.png" alt="" width={34} height={34} className="size-9 object-contain" />
          <span>JJ的快乐小屋</span>
        </Link>
        <DesktopNav admin={profile.role === "admin"} />
        <div className="flex items-center gap-2.5">
          {profile.role === "admin" && (
            <Link
              href="/admin"
              aria-label="打开管理后台"
              className="flex size-10 items-center justify-center rounded-full bg-brown text-white shadow-sm sm:size-auto sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs sm:font-semibold"
            >
              <ShieldCheck className="size-4 sm:size-3.5" />
              <span className="hidden sm:inline">管理后台</span>
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
