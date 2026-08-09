import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { Profile } from "@/types/database";
import { MediaImage } from "@/components/ui/media-image";
import { getPublicImageUrl } from "@/lib/utils";

export function AppHeader({ profile }: { profile: Profile }) {
  const avatar = getPublicImageUrl("avatars", profile.avatar_url);
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/85 backdrop-blur-xl">
      <div className="page-shell flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-tight text-brown">
          <Image src="/nailong/nailong-3d.png" alt="" width={34} height={34} className="size-9 object-contain" />
          <span>奶龙情侣点单站</span>
        </Link>
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
