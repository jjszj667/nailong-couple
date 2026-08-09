import type { Product } from "@/types/database";
import { saveProductAction } from "@/app/actions";
import { ImagePicker } from "@/components/image-picker";
import { SubmitButton } from "@/components/ui/submit-button";

export function ProductForm({ product }: { product?: Product }) {
  return (
    <form action={saveProductAction} className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <div><ImagePicker label={product ? "选择新商品图片（可选）" : "选择商品图片（可选）"} /><input type="hidden" name="existing_image" value={product?.image_url ?? ""} /></div>
      <div className="space-y-4">
        <input type="hidden" name="id" value={product?.id ?? ""} />
        <label className="block text-sm font-semibold text-brown">商品名称<input name="name" className="field mt-2" defaultValue={product?.name} maxLength={60} required /></label>
        <label className="block text-sm font-semibold text-brown">描述<textarea name="description" className="field mt-2 min-h-28 resize-y" defaultValue={product?.description} maxLength={1000} /></label>
        <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-semibold text-brown">价格<input name="price" type="number" min={1} step={1} className="field mt-2" defaultValue={product?.price ?? 80} required /></label><label className="block text-sm font-semibold text-brown">库存<input name="stock" type="number" min={0} step={1} className="field mt-2" defaultValue={product?.stock ?? 1} required /></label></div>
        <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-semibold text-brown">分类<select name="category" className="field mt-2" defaultValue={product?.category ?? "other"}><option value="food">吃喝</option><option value="date">约会</option><option value="gift">礼物</option><option value="game">陪玩</option><option value="special">特别</option><option value="other">其他</option></select></label><label className="block text-sm font-semibold text-brown">状态<select name="status" className="field mt-2" defaultValue={product?.status ?? "active"}><option value="active">上架</option><option value="inactive">下架</option><option value="sold_out">售罄</option></select></label></div>
        <div className="flex flex-wrap gap-5 rounded-2xl bg-amber-50 p-4 text-sm"><label className="flex items-center gap-2 font-semibold text-brown"><input name="is_featured" type="checkbox" defaultChecked={product?.is_featured} className="size-4 accent-amber-500" />首页推荐</label><label className="flex items-center gap-2 font-semibold text-brown"><input name="is_hidden" type="checkbox" defaultChecked={product?.is_hidden} className="size-4 accent-amber-500" />对普通用户隐藏</label></div>
        <SubmitButton pendingText="正在保存商品…">{product ? "保存修改" : "创建商品"}</SubmitButton>
      </div>
    </form>
  );
}
