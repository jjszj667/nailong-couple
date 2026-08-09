import Link from "next/link";
import { ArrowLeft, Boxes, CalendarHeart, ClipboardCheck, Coins, Footprints, Gift, Heart, LayoutDashboard, Megaphone, Settings, SmilePlus, Trophy, Utensils } from "lucide-react";

const items = [
  ["/admin", "概览", LayoutDashboard],
  ["/admin/products", "商品", Boxes],
  ["/admin/orders", "订单", ClipboardCheck],
  ["/admin/wallet", "奶龙币", Coins],
  ["/admin/checkins", "签到", Utensils],
  ["/admin/moods", "心情", SmilePlus],
  ["/admin/wishes", "愿望", Heart],
  ["/admin/calendar", "纪念日", CalendarHeart],
  ["/admin/mysteries", "惊喜", Gift],
  ["/admin/achievements", "成就", Trophy],
  ["/admin/places", "足迹", Footprints],
  ["/admin/announcements", "留言", Megaphone],
  ["/admin/settings", "设置", Settings],
] as const;

export function AdminNav() {
  return (
    <aside className="soft-card h-fit p-3 lg:sticky lg:top-6 lg:w-56">
      <Link href="/" className="mb-3 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-muted hover:bg-amber-50">
        <ArrowLeft className="size-4" />返回小世界
      </Link>
      <nav className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-1">
        {items.map(([href, label, Icon]) => (
          <Link key={href} href={href} className="flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold text-brown hover:bg-amber-100 lg:justify-start">
            <Icon className="size-4 text-nailong-deep" />{label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
