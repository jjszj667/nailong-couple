"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, CalendarDays, Camera, Home, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export function DesktopNav({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "小屋首页", icon: Home },
    { href: "/checkin", label: admin ? "她的签到" : "每日签到", icon: Camera },
    { href: admin ? "/admin/products" : "/shop", label: admin ? "商品管理" : "快乐商店", icon: admin ? Boxes : ShoppingBag },
    { href: "/calendar", label: "我们的日历", icon: CalendarDays },
  ];
  return <nav className="desktop-nav hidden items-center gap-1 md:flex" aria-label="桌面导航">{items.map(({ href, label, icon: Icon }) => {
    const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
    return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("desktop-nav-link", active && "is-active")}><Icon className="size-4" />{label}</Link>;
  })}</nav>;
}
