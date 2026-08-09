import { CheckCircle2, Heart, Plus, Trash2 } from "lucide-react";
import { deleteWishAction, saveWishAction } from "@/app/actions";
import { getWishesData } from "@/lib/life-data";
import { Card } from "@/components/ui/card";
import { Flash } from "@/components/ui/flash";
import { MediaImage } from "@/components/ui/media-image";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Wish } from "@/types/database";

export const metadata = { title: "愿望清单" };

const categoryLabels: Record<string, string> = { food: "想吃", travel: "想去", gift: "想要", activity: "想一起做", movie: "想看", other: "小愿望" };

function WishForm({ wish }: { wish?: Wish & { signed_url?: string | null } }) {
  return <form action={saveWishAction} className="space-y-3"><input type="hidden" name="id" value={wish?.id ?? ""} /><input type="hidden" name="existing_image" value={wish?.image_url ?? ""} /><input name="title" className="field" required maxLength={100} defaultValue={wish?.title} placeholder="例如：想吃海底捞" /><textarea name="description" className="field min-h-20" maxLength={800} defaultValue={wish?.description} placeholder="再说一点点（可选）" /><div className="grid grid-cols-2 gap-3"><select name="category" className="field" defaultValue={wish?.category ?? "food"}><option value="food">想吃什么</option><option value="travel">想去哪</option><option value="gift">想买什么</option><option value="activity">想一起做什么</option><option value="movie">想看的电影</option><option value="other">其他</option></select><select name="status" className="field" defaultValue={wish?.status ?? "active"}><option value="active">想要实现</option><option value="completed">愿望实现啦</option><option value="archived">先收起来</option></select></div><label className="block text-xs font-semibold text-muted">配一张照片（可选）<input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="field mt-2 text-sm" /></label><SubmitButton pendingText="正在保存…">{wish ? "保存修改" : "收进愿望清单"}</SubmitButton></form>;
}

export default async function WishesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [wishes, flash] = await Promise.all([getWishesData(), searchParams]);
  return <main className="page-shell py-6 sm:py-10"><div className="mb-6"><p className="text-xs font-bold text-nailong-deep">OUR WISHES</p><h1 className="mt-1 text-3xl font-black text-brown">愿望清单</h1><p className="mt-2 text-sm text-muted">想吃、想去、想一起完成的小事，都先放在这里。</p></div><Flash {...flash} />
    <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]"><Card className="h-fit"><div className="mb-4 flex items-center gap-2"><Plus className="size-5 text-nailong-deep" /><h2 className="font-black text-brown">新增一个愿望</h2></div><WishForm /></Card>
      <div className="space-y-4">{wishes.length ? wishes.map((wish) => <Card key={wish.id} className={wish.status === "completed" ? "border-green-200 bg-green-50/70" : ""}><div className="flex gap-4">{wish.signed_url && <MediaImage src={wish.signed_url} alt={wish.title} className="size-24 shrink-0 rounded-2xl" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-brown">{categoryLabels[wish.category]}</span>{wish.status === "completed" && <span className="flex items-center gap-1 text-xs font-bold text-green-700"><CheckCircle2 className="size-4" />愿望实现啦 ❤️</span>}</div><h2 className="mt-2 text-lg font-black text-brown">{wish.title}</h2>{wish.description && <p className="mt-1 text-sm leading-6 text-muted">{wish.description}</p>}</div></div><div className="mt-4 flex items-center gap-3"><details className="flex-1"><summary className="cursor-pointer text-sm font-bold text-nailong-deep">编辑愿望</summary><div className="mt-4 rounded-2xl bg-white/80 p-4"><WishForm wish={wish} /></div></details><form action={deleteWishAction}><input type="hidden" name="wish_id" value={wish.id} /><button className="flex size-10 items-center justify-center rounded-full bg-stone-100 text-muted" aria-label="删除愿望"><Trash2 className="size-4" /></button></form></div></Card>) : <Card className="py-16 text-center"><Heart className="mx-auto size-10 text-nailong-deep" /><h2 className="mt-4 font-black text-brown">愿望清单还空空的</h2><p className="mt-2 text-sm text-muted">先写下一件最近最想一起完成的小事吧。</p></Card>}</div>
    </div>
  </main>;
}
