"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Camera, Home, ShoppingBag, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "首页", icon: Home },
  { href: "/checkin", label: "签到", icon: Camera },
  { href: "/shop", label: "商店", icon: ShoppingBag },
  { href: "/calendar", label: "日历", icon: CalendarDays },
  { href: "/profile", label: "我的", icon: UserRound },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line/80 bg-milk/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(94,70,28,0.08)] backdrop-blur-xl md:hidden" aria-label="主要导航">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={cn("flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium text-muted", active && "bg-amber-100/80 text-brown")}>
              <Icon className={cn("size-5", active && "text-nailong-deep")} strokeWidth={active ? 2.6 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
