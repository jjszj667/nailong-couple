import Link from "next/link";
import { ArrowRight, Gift, ShoppingBag } from "lucide-react";
import { getShopData } from "@/lib/data";
import { getPublicImageUrl } from "@/lib/utils";
import { Coin } from "@/components/ui/coin";
import { Card } from "@/components/ui/card";
import { MediaImage } from "@/components/ui/media-image";
import { StatusBadge } from "@/components/ui/status-badge";
import { Flash } from "@/components/ui/flash";

export const metadata = { title: "奖励商城" };

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [data, flash] = await Promise.all([getShopData(), searchParams]);
  const balance = data.wallet?.available_balance ?? 0;
  return (
    <main className="page-shell py-7 sm:py-10">
      <section className="mb-7 flex flex-col gap-5 rounded-[2rem] bg-brown p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-nailong">
            Reward shop
          </p>
          <h1 className="mt-1 text-3xl font-black">把认真吃饭换成快乐</h1>
          <p className="mt-2 text-sm text-white/65">
            这里的每件奖励，都是我们之后要一起做的事。
          </p>
        </div>
        <div className="rounded-3xl bg-white/10 px-5 py-4">
          <p className="text-xs text-white/60">当前可用</p>
          <Coin value={balance} className="mt-1 text-2xl text-white" />
        </div>
      </section>
      <Flash error={flash.error} />
      {data.products.length ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.products.map((product) => {
            const short = Math.max(0, product.price - balance);
            return (
              <Link
                href={`/shop/${product.id}`}
                key={product.id}
                className="group"
              >
                <Card className="h-full overflow-hidden p-3 transition duration-200 group-hover:-translate-y-1 group-hover:shadow-xl">
                  <div className="relative">
                    <MediaImage
                      src={getPublicImageUrl(
                        "product-images",
                        product.image_url,
                      )}
                      alt={product.name}
                      className="aspect-[4/3] w-full rounded-[1.35rem]"
                    />
                    {product.is_featured && (
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-orange shadow-sm">
                        推荐
                      </span>
                    )}
                    {product.product_type === "mystery" && (
                      <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-brown/90 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                        <Gift className="size-3" />
                        惊喜箱
                      </span>
                    )}
                  </div>
                  <div className="p-2 pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-black text-brown">
                        {product.name}
                      </h2>
                      <StatusBadge status={product.status} context="life" />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                      {product.product_type === "mystery"
                        ? product.mystery_hint || "里面是什么？兑换以后才知道。"
                        : product.description}
                    </p>
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <Coin value={product.price} />
                        <p className="mt-1 text-xs text-muted">
                          {short === 0
                            ? "现在就可以兑换"
                            : `还差 ${short} 奶龙币`}
                        </p>
                      </div>
                      <span className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-nailong-deep">
                        <ArrowRight className="size-4" />
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </section>
      ) : (
        <Card className="py-16 text-center">
          <ShoppingBag className="mx-auto size-10 text-nailong-deep" />
          <h2 className="mt-4 font-bold text-brown">奖励架暂时空空的</h2>
          <p className="mt-1 text-sm text-muted">等小屋里出现一些新惊喜吧。</p>
        </Card>
      )}
    </main>
  );
}
