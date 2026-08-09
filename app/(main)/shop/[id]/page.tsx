import Link from "next/link";
import { ArrowLeft, Clock3, Gift, PackageCheck, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { redeemAction } from "@/app/actions";
import { getProduct, getShopData } from "@/lib/data";
import { getPublicImageUrl } from "@/lib/utils";
import { MediaImage } from "@/components/ui/media-image";
import { Coin } from "@/components/ui/coin";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Flash } from "@/components/ui/flash";

export default async function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  const [product, shop] = await Promise.all([getProduct(id), getShopData()]);
  if (!product || product.is_hidden) notFound();
  const balance = shop.wallet?.available_balance ?? 0;
  const canRedeem = product.status === "active" && product.stock > 0 && balance >= product.price;
  return (
    <main className="page-shell py-7 sm:py-10">
      <Link href="/shop" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted"><ArrowLeft className="size-4" />返回奖励商城</Link>
      <Flash error={flash.error} />
      <section className="soft-card grid overflow-hidden p-3 md:grid-cols-2 md:p-4">
        <MediaImage src={getPublicImageUrl("product-images", product.image_url)} alt={product.name} className="aspect-square w-full rounded-[1.7rem]" />
        <div className="flex flex-col p-4 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-nailong-deep">{product.product_type === "mystery" ? "MYSTERY BOX" : product.category}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-brown">{product.name}</h1></div><StatusBadge status={product.status} /></div>{product.product_type === "mystery" ? <div className="mt-5 rounded-3xl bg-brown p-5 text-white"><Gift className="size-6 text-nailong" /><p className="mt-3 font-black">里面是什么？现在不剧透</p><p className="mt-2 text-sm leading-6 text-white/65">{product.mystery_hint || "兑换后奶龙会偷偷准备，准备好后由你亲手揭晓。"}</p></div> : <p className="mt-5 leading-8 text-muted">{product.description}</p>}<div className="mt-6 rounded-3xl bg-amber-50 p-5"><p className="text-xs text-muted">兑换需要</p><Coin value={product.price} className="mt-1 text-3xl" /><div className="mt-4 flex items-center gap-2 text-xs text-muted"><PackageCheck className="size-4" />剩余 {product.stock} 份</div></div><div className="mt-auto pt-7"><div className="mb-4 flex items-center justify-between text-sm"><span className="text-muted">你的可用奶龙币</span><Coin value={balance} /></div>{canRedeem ? <form action={redeemAction}><input type="hidden" name="product_id" value={product.id} /><input type="hidden" name="request_id" value={crypto.randomUUID()} /><SubmitButton className="w-full" pendingText="正在提交兑换…"><Sparkles className="size-4" />申请兑换</SubmitButton></form> : <button type="button" disabled className="pill-button w-full">{product.status !== "active" || product.stock <= 0 ? "暂时不能兑换" : `还差 ${product.price - balance} 奶龙币`}</button>}{canRedeem && <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted"><Clock3 className="mt-0.5 size-3.5 shrink-0" />提交后会先冻结奶龙币，管理员审核通过才会正式消费。</p>}</div></div>
      </section>
    </main>
  );
}
