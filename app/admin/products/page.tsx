import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { deleteProductAction } from "@/app/actions";
import { getAdminProducts } from "@/lib/data";
import { getPublicImageUrl } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Coin } from "@/components/ui/coin";
import { Flash } from "@/components/ui/flash";
import { MediaImage } from "@/components/ui/media-image";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [products, flash] = await Promise.all([getAdminProducts(), searchParams]);
  return <div><div className="mb-5 flex items-center justify-between gap-4"><div><h2 className="text-xl font-black text-brown">商品管理</h2><p className="mt-1 text-sm text-muted">价格、库存、上下架和隐藏状态都可以随时调整。</p></div><Link href="/admin/products/new" className="pill-button shrink-0"><Plus className="size-4" />新增</Link></div><Flash {...flash} /><div className="space-y-3">{products.map((product) => <Card key={product.id} className="flex items-center gap-3 p-3 sm:gap-4"><MediaImage src={getPublicImageUrl("product-images", product.image_url)} alt={product.name} className="size-16 shrink-0 rounded-2xl sm:size-20" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold text-brown">{product.name}</h3><StatusBadge status={product.status} />{product.is_hidden && <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">隐藏</span>}</div><div className="mt-2 flex flex-wrap gap-3 text-xs text-muted"><Coin value={product.price} className="text-xs" /><span>库存 {product.stock}</span><span>{product.category}</span></div></div><div className="flex shrink-0 flex-col gap-2 sm:flex-row"><Link href={`/admin/products/${product.id}`} className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-nailong-deep" aria-label={`编辑${product.name}`}><Pencil className="size-4" /></Link><form action={deleteProductAction}><input type="hidden" name="product_id" value={product.id} /><SubmitButton className="min-h-10 bg-stone-100 px-3 text-xs text-stone-600 shadow-none" pendingText="…">删除</SubmitButton></form></div></Card>)}</div></div>;
}
