import Link from "next/link";
import {
  Award,
  CalendarDays,
  Camera,
  ChevronRight,
  Coins,
  Footprints,
  Gift,
  Heart,
  ImageIcon,
  LogOut,
  NotebookPen,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { logoutAction, updateProfileAction } from "@/app/actions";
import { getProfileData } from "@/lib/data";
import { getProfileLifeData } from "@/lib/life-data";
import { dateInShanghai } from "@/lib/life";
import { Card } from "@/components/ui/card";
import { Coin } from "@/components/ui/coin";
import { Flash } from "@/components/ui/flash";
import { MediaImage } from "@/components/ui/media-image";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "我的" };

const groups: {
  title: string;
  items: { href: string; label: string; hint: string; icon: LucideIcon }[];
}[] = [
  {
    title: "我的资产",
    items: [
      { href: "/wallet", label: "奶龙币", hint: "查看余额与流水", icon: Coins },
      {
        href: "/orders",
        label: "我的兑换",
        hint: "查看奖励与惊喜",
        icon: ReceiptText,
      },
    ],
  },
  {
    title: "我们的生活",
    items: [
      {
        href: "/memories",
        label: "我们的回忆",
        hint: "吃饭和生活照片",
        icon: ImageIcon,
      },
      {
        href: "/story",
        label: "我们的故事",
        hint: "重要日子的时间线",
        icon: Heart,
      },
      {
        href: "/calendar",
        label: "我们的日历",
        hint: "统一时间入口",
        icon: CalendarDays,
      },
      {
        href: "/daily/today",
        label: "奶龙日报",
        hint: "今天的生活卡片",
        icon: NotebookPen,
      },
      {
        href: "/places",
        label: "我们的足迹",
        hint: "地点卡片与时间轴",
        icon: Footprints,
      },
    ],
  },
  {
    title: "我们的愿望",
    items: [
      {
        href: "/wishes",
        label: "愿望清单",
        hint: "想吃、想去、想一起做",
        icon: Heart,
      },
      {
        href: "/orders",
        label: "惊喜箱",
        hint: "等待揭晓的小惊喜",
        icon: Gift,
      },
    ],
  },
  {
    title: "我们的收藏",
    items: [
      {
        href: "/achievements",
        label: "情侣成就",
        hint: "一起解锁的徽章",
        icon: Award,
      },
    ],
  },
];

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [data, life, flash] = await Promise.all([
    getProfileData(),
    getProfileLifeData(),
    searchParams,
  ]);
  const today = dateInShanghai();
  return (
    <main className="page-shell max-w-5xl py-6 sm:py-10">
      <Flash {...flash} />
      <Card className="relative overflow-hidden bg-gradient-to-br from-amber-100 to-orange-50">
        <div className="absolute -right-8 -top-12 size-44 rounded-full bg-nailong/20" />
        <div className="relative flex items-center gap-4">
          <MediaImage
            src={data.avatarUrl}
            alt={data.profile.nickname}
            className="size-20 rounded-[1.75rem] border-4 border-white shadow-md"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-black text-brown">
              {data.profile.nickname}
            </h1>
            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-muted">
              <Heart className="size-3.5 text-rose-400" />
              Jj 的快乐小屋成员
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Coin
                value={life.wallet?.available_balance ?? 0}
                className="text-sm"
              />
              {life.relationshipDays && (
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-brown">
                  我们第 {life.relationshipDays} 天
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {data.profile.role === "admin" && (
        <Link
          href="/admin"
          className="mt-4 flex min-h-16 items-center gap-3 rounded-[1.75rem] bg-brown px-4 py-3 text-white shadow-[0_12px_30px_rgba(91,69,39,0.2)] transition active:scale-[0.99]"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-nailong text-brown">
            <ShieldCheck className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-black">进入管理后台</span>
            <span className="block text-xs text-white/70">
              管理订单、商品、签到、纪念日和设置
            </span>
          </span>
          <ChevronRight className="size-5 text-white/70" />
        </Link>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.title}>
              <h2 className="mb-3 px-1 text-sm font-black text-brown">
                {group.title}
              </h2>
              <Card className="divide-y divide-line p-2">
                {group.items.map(({ href, label, hint, icon: Icon }) => (
                  <Link
                    href={href === "/daily/today" ? `/daily/${today}` : href}
                    key={label}
                    className="flex min-h-16 items-center gap-3 rounded-2xl px-3 py-2 transition hover:bg-amber-50"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-nailong-deep">
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-brown">
                        {label}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {hint}
                      </span>
                    </span>
                    <ChevronRight className="size-4 text-muted" />
                  </Link>
                ))}
              </Card>
            </section>
          ))}
        </div>
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-nailong-deep" />
              <h2 className="font-black text-brown">生活小档案</h2>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                [Camera, "累计签到", data.totalCheckins],
                [Award, "连续签到", `${data.streak} 天`],
                [Coins, "累计获得", data.totalEarned],
                [ReceiptText, "累计兑换", data.totalOrders],
              ].map(([Icon, label, value]) => {
                const StatIcon = Icon as LucideIcon;
                return (
                  <div
                    key={String(label)}
                    className="rounded-2xl bg-amber-50 p-3"
                  >
                    <StatIcon className="size-4 text-nailong-deep" />
                    <p className="mt-2 text-xs text-muted">{String(label)}</p>
                    <p className="mt-1 font-black text-brown">
                      {String(value)}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <UserRound className="size-5 text-nailong-deep" />
              <h2 className="font-black text-brown">个人资料</h2>
            </div>
            <form action={updateProfileAction} className="mt-4 space-y-4">
              <label className="block text-sm font-semibold text-brown">
                昵称
                <input
                  name="nickname"
                  className="field mt-2"
                  defaultValue={data.profile.nickname}
                  maxLength={30}
                  required
                />
              </label>
              <label className="block text-sm font-semibold text-brown">
                新头像（可选）
                <input
                  name="avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="field mt-2 text-sm"
                />
              </label>
              <SubmitButton pendingText="正在保存…">保存资料</SubmitButton>
            </form>
            <form
              action={logoutAction}
              className="mt-4 border-t border-line pt-4"
            >
              <SubmitButton
                className="bg-stone-100 text-stone-700 shadow-none"
                pendingText="正在退出…"
              >
                <LogOut className="size-4" />
                退出登录
              </SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}
