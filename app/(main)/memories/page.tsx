import Link from "next/link";
import { Camera, CalendarDays, ImagePlus, Search } from "lucide-react";
import { getMemoriesData } from "@/lib/data";
import { dateInShanghai } from "@/lib/life";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { MediaImage } from "@/components/ui/media-image";

export const metadata = { title: "我们的回忆" };

const categories = [
  ["all", "全部"],
  ["food", "吃饭"],
  ["life", "生活"],
  ["travel", "旅行"],
  ["date", "约会"],
  ["gift", "礼物"],
  ["other", "其他"],
] as const;

export default async function MemoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; category?: string }>;
}) {
  const query = await searchParams;
  const category = categories.some(([value]) => value === query.category)
    ? query.category!
    : "all";
  const data = await getMemoriesData(query.date, category);
  const months = Array.from(
    new Set(data.items.map((item) => item.date.slice(0, 7))),
  );

  return (
    <main className="page-shell py-7 sm:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-nailong-deep">
            Our memories
          </p>
          <h1 className="mt-1 text-3xl font-black text-brown">我们的回忆</h1>
          <p className="mt-2 text-sm text-muted">
            吃饭、见面、旅行和生活里的小瞬间，都在这里慢慢长大。
          </p>
        </div>
        <Link
          href={`/calendar/${dateInShanghai()}#photos`}
          className="pill-button self-start"
        >
          <ImagePlus className="size-4" /> 添加生活照片
        </Link>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {categories.map(([value, label]) => (
          <Link
            key={value}
            href={`/memories?category=${value}${query.date ? `&date=${query.date}` : ""}`}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${category === value ? "bg-brown text-white" : "bg-white text-muted"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <form className="mb-7 flex max-w-md gap-2">
        <input type="hidden" name="category" value={category} />
        <label className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            className="field pl-9"
            type="date"
            name="date"
            defaultValue={query.date}
          />
        </label>
        <button className="pill-button px-4">查看</button>
      </form>

      {data.items.length ? (
        <div className="space-y-9">
          {months.map((month) => {
            const [year, monthNumber] = month.split("-").map(Number);
            const items = data.items.filter((item) =>
              item.date.startsWith(month),
            );
            return (
              <section key={month}>
                <div className="mb-3 flex items-center gap-2">
                  <CalendarDays className="size-5 text-nailong-deep" />
                  <h2 className="text-lg font-black text-brown">
                    {year} 年 {monthNumber} 月
                  </h2>
                  <span className="text-xs text-muted">{items.length} 张</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {items.map((item) => (
                    <figure
                      key={item.id}
                      className="soft-card min-w-0 overflow-hidden p-2"
                    >
                      <a
                        href={item.signedUrl || "#"}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="查看大图"
                      >
                        <MediaImage
                          src={item.signedUrl}
                          alt={item.caption}
                          className="aspect-square w-full rounded-[1.25rem]"
                        />
                      </a>
                      <figcaption className="p-2">
                        <p className="line-clamp-2 text-sm font-bold text-brown">
                          {item.caption}
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                          {item.owner?.nickname ?? "我们"} ·{" "}
                          {formatDate(item.date)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          来源：
                          {item.source === "checkin" ? "吃饭签到" : "生活照片"}
                        </p>
                        <Link
                          href={`/calendar/${item.date}`}
                          className="mt-2 inline-flex text-xs font-bold text-nailong-deep"
                        >
                          看看那一天 →
                        </Link>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <Card className="py-16 text-center">
          <Camera className="mx-auto size-10 text-nailong-deep" />
          <h2 className="mt-4 font-bold text-brown">这一页还没有照片</h2>
          <p className="mt-1 text-sm text-muted">
            吃饭签到照片会自动出现，也可以给某一天添加生活照片。
          </p>
        </Card>
      )}
    </main>
  );
}
