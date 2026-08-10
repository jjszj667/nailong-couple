import Link from "next/link";
import Image from "next/image";
import { CalendarHeart, Heart, MapPin, Plane, Sparkles } from "lucide-react";
import { getStoryData } from "@/lib/life-data";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { MediaImage } from "@/components/ui/media-image";

export const metadata = { title: "我们的故事" };

const icons: Record<string, typeof Heart> = {
  anniversary: Heart,
  travel: Plane,
  date: MapPin,
  birthday: Sparkles,
  special: CalendarHeart,
};

export default async function StoryPage() {
  const data = await getStoryData();
  return (
    <main className="page-shell max-w-4xl py-7 sm:py-10">
      <header className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-amber-100 via-yellow-50 to-rose-100 p-6 sm:p-9">
        <Image
          src="/nailong/nailong-3d.png"
          alt="陪我们翻故事的奶龙"
          width={132}
          height={132}
          className="absolute -right-2 bottom-0 size-28 object-contain opacity-80 sm:size-32"
        />
        <div className="relative max-w-xl pr-20">
          <p className="text-xs font-bold text-nailong-deep">OUR STORY</p>
          <h1 className="mt-2 text-3xl font-black text-brown">我们的故事</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            只有被我们认真标记的重要日子，才会留在这条时间线上。
          </p>
        </div>
      </header>

      {data.events.length ? (
        <section className="relative mx-auto mt-8 max-w-2xl pl-10 sm:pl-14">
          <div className="absolute bottom-10 left-[1.15rem] top-5 w-1 rounded-full bg-gradient-to-b from-nailong via-amber-300 to-rose-200 sm:left-[1.65rem]" />
          <div className="space-y-6">
            {data.events.map((event) => {
              const Icon = icons[event.event_type] ?? Heart;
              const photo = data.photos.find(
                (item) => item.photo_date === event.event_date,
              );
              return (
                <article key={event.id} className="relative">
                  <span className="absolute -left-10 top-5 z-10 flex size-9 items-center justify-center rounded-full border-4 border-milk bg-nailong text-brown shadow-sm sm:-left-14 sm:size-11">
                    <Icon className="size-4 sm:size-5" />
                  </span>
                  <Link href={`/calendar/${event.event_date}`}>
                    <Card className="overflow-hidden p-0 transition hover:-translate-y-0.5">
                      {photo && (
                        <MediaImage
                          src={photo.signed_url}
                          alt={photo.caption || event.title}
                          className="aspect-[16/7] w-full"
                        />
                      )}
                      <div className="p-5">
                        <p className="text-xs font-bold text-nailong-deep">
                          {formatDate(event.event_date)}
                        </p>
                        <h2 className="mt-1 text-xl font-black text-brown">
                          {event.title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          {event.note || "这一天，故事又向前走了一小步。"}
                        </p>
                      </div>
                    </Card>
                  </Link>
                </article>
              );
            })}
            <article className="relative">
              <span className="absolute -left-10 top-4 z-10 flex size-9 items-center justify-center rounded-full border-4 border-milk bg-rose-200 text-rose-600 sm:-left-14 sm:size-11">
                <Heart className="size-4 fill-current sm:size-5" />
              </span>
              <Card className="bg-gradient-to-r from-amber-50 to-rose-50">
                <p className="text-xs font-bold text-rose-500">今天</p>
                <p className="mt-1 text-lg font-black text-brown">
                  {data.relationshipDays
                    ? `我们已经一起走过 ${data.relationshipDays} 天`
                    : "我们的故事还在继续"}
                </p>
              </Card>
            </article>
          </div>
        </section>
      ) : (
        <Card className="mt-8 py-16 text-center">
          <CalendarHeart className="mx-auto size-10 text-nailong-deep" />
          <h2 className="mt-4 font-black text-brown">时间线还在等第一章</h2>
          <p className="mt-2 text-sm text-muted">
            在日历事件中勾选“加入我们的故事”，重要日子就会出现在这里。
          </p>
          <Link href="/calendar" className="pill-button mt-5 inline-flex">
            去日历收藏故事
          </Link>
        </Card>
      )}
    </main>
  );
}
