import { Card } from "@/components/ui/card";
import { Flash } from "@/components/ui/flash";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const flash = await searchParams;
  return <div><h2 className="text-xl font-black text-brown">新增商品</h2><p className="mt-1 text-sm text-muted">创建一份新的陪伴奖励或小惊喜。</p><Flash error={flash.error} /><Card className="mt-5"><ProductForm /></Card></div>;
}
