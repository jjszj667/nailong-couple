import { Camera } from "lucide-react";
import { getAdminPartnerCheckinData } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { MediaImage } from "@/components/ui/media-image";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function AdminCheckinsPage() {
  const data = await getAdminPartnerCheckinData();
  const checkins = data.recentCheckins;
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-black text-brown">
          {data.partner ? `${data.partner.nickname}的签到记录` : "她的签到记录"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          按北京时间展示她最近的午间、晚间正常签到和补签记录。
        </p>
      </div>
      {checkins.length ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {checkins.map((item) => (
            <Card key={item.id} className="p-3">
              <a href={item.signed_url || "#"} target="_blank" rel="noreferrer">
                <MediaImage
                  src={item.signed_url}
                  alt="签到照片"
                  className="aspect-[4/3] w-full rounded-2xl"
                />
              </a>
              <div className="flex items-center justify-between gap-3 p-2 pt-4">
                <div>
                  <p className="font-semibold text-brown">
                    {formatDate(item.checkin_date)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {item.checkin_kind === "makeup" ? "补签" : "正常签到"} ·
                    奖励 +{item.reward_amount}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <StatusBadge status={item.type} />
                  {item.checkin_kind === "makeup" && (
                    <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">
                      补签
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </section>
      ) : (
        <Card className="py-14 text-center">
          <Camera className="mx-auto size-9 text-nailong-deep" />
          <p className="mt-3 text-sm text-muted">还没有签到照片。</p>
        </Card>
      )}
    </div>
  );
}
