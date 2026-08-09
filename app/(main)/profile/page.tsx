import { Award, Camera, Coins, LogOut, ReceiptText, ShieldCheck } from "lucide-react";
import { logoutAction, updateProfileAction } from "@/app/actions";
import { getProfileData } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Flash } from "@/components/ui/flash";
import { MediaImage } from "@/components/ui/media-image";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "个人中心" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [data, flash] = await Promise.all([getProfileData(), searchParams]);
  const stats = [[Camera, "累计签到", data.totalCheckins], [Award, "连续签到", `${data.streak} 天`], [Coins, "累计获得", data.totalEarned], [Coins, "累计消费", data.totalSpent], [ReceiptText, "累计兑换", data.totalOrders]] as const;
  return (
    <main className="page-shell max-w-4xl py-7 sm:py-10"><div className="mb-7"><p className="text-xs font-bold uppercase tracking-wider text-nailong-deep">My corner</p><h1 className="mt-1 text-3xl font-black text-brown">我的小角落</h1></div><Flash {...flash} />
      <section className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><Card className="text-center"><MediaImage src={data.avatarUrl} alt={data.profile.nickname} className="mx-auto size-28 rounded-[2.25rem] border-4 border-white shadow-lg" /><h2 className="mt-4 text-2xl font-black text-brown">{data.profile.nickname}</h2><span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800"><ShieldCheck className="size-3.5" />{data.profile.role === "admin" ? "管理员" : "普通用户"}</span><form action={logoutAction} className="mt-6"><SubmitButton className="bg-stone-100 text-stone-700 shadow-none" pendingText="正在退出…"><LogOut className="size-4" />退出登录</SubmitButton></form></Card>
        <div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{stats.map(([Icon, label, value]) => <Card key={label} className="p-4"><Icon className="size-5 text-nailong-deep" /><p className="mt-3 text-xs text-muted">{label}</p><p className="mt-1 text-xl font-black text-brown">{value}</p></Card>)}</div><Card className="mt-4"><h2 className="text-lg font-black text-brown">修改个人资料</h2><form action={updateProfileAction} className="mt-4 space-y-4"><label className="block text-sm font-semibold text-brown">昵称<input name="nickname" className="field mt-2" defaultValue={data.profile.nickname} maxLength={30} required /></label><label className="block text-sm font-semibold text-brown">新头像（可选）<input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" className="field mt-2 text-sm" /></label><SubmitButton pendingText="正在保存…">保存资料</SubmitButton></form></Card></div></section>
    </main>
  );
}
