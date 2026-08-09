import { notFound } from "next/navigation";
import { getAdminProduct } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Flash } from "@/components/ui/flash";
import { ProductForm } from "@/components/admin/product-form";

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  const product = await getAdminProduct(id);
  if (!product) notFound();
  return <div><h2 className="text-xl font-black text-brown">编辑商品</h2><p className="mt-1 text-sm text-muted">修改只影响后续兑换，历史订单快照不会变化。</p><Flash error={flash.error} /><Card className="mt-5"><ProductForm product={product} /></Card></div>;
}
