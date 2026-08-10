import { MessageCircleHeart } from "lucide-react";
import { respondToMoodAction } from "@/app/actions";
import { getAdminMoodsData } from "@/lib/life-data";
import { moodMeta } from "@/lib/life";
import { Card } from "@/components/ui/card";
import { Coin } from "@/components/ui/coin";
import { Flash } from "@/components/ui/flash";
import { MoodIcon } from "@/components/mood-icon";
import { SubmitButton } from "@/components/ui/submit-button";

const quick = ["抱抱你", "今晚陪你聊聊", "辛苦啦", "想吃什么告诉我", "我在呢"];

export default async function AdminMoodsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [data, flash] = await Promise.all([getAdminMoodsData(), searchParams]);
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-black text-brown">心情回应</h2>
        <p className="mt-1 text-sm text-muted">
          回应她的生活记录；可选奖励只会发放一次。
        </p>
      </div>
      <Flash {...flash} />
      <div className="space-y-4">
        {data.moods.length ? (
          data.moods.map((mood) => {
            const meta = moodMeta(mood.value);
            const response = data.responses.find(
              (item) => item.mood_id === mood.id,
            );
            const profile = data.profiles.find(
              (item) => item.id === mood.user_id,
            );
            return (
              <Card key={mood.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-nailong-deep">
                      {mood.mood_date} · {profile?.nickname ?? "她"}
                    </p>
                    <h3 className="mt-2 flex items-center gap-2 text-lg font-black text-brown">
                      <MoodIcon image={meta.image} label={meta.label} className="size-10" sizes="40px" />
                      {meta.label}
                    </h3>
                    {mood.note && (
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {mood.note}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {mood.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-amber-50 px-2 py-1 text-xs text-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {response && (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                      已回应
                    </span>
                  )}
                </div>
                <form
                  action={respondToMoodAction}
                  className="mt-5 rounded-3xl bg-amber-50 p-4"
                >
                  <input type="hidden" name="mood_id" value={mood.id} />
                  <label className="block text-sm font-bold text-brown">
                    快捷回应
                    <select
                      name="quick_content"
                      className="field mt-2"
                      defaultValue=""
                    >
                      <option value="">自定义文字</option>
                      {quick.map((text) => (
                        <option key={text} value={text}>
                          {text}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="mt-3 block text-sm font-bold text-brown">
                    自定义文字
                    <textarea
                      name="content"
                      className="field mt-2 min-h-20"
                      maxLength={300}
                      defaultValue={response?.content ?? ""}
                      placeholder="留空时使用上面的快捷回应"
                    />
                  </label>
                  <label className="mt-3 block text-sm font-bold text-brown">
                    附带奶龙币（可选）
                    <input
                      name="coin_reward"
                      type="number"
                      min={0}
                      step={1}
                      className="field mt-2"
                      defaultValue={response?.coin_reward ?? 0}
                      readOnly={Boolean(response?.reward_transaction_id)}
                    />
                  </label>
                  {response?.coin_reward ? (
                    <p className="mt-2 text-xs text-muted">
                      已经发放{" "}
                      <Coin value={response.coin_reward} className="text-xs" />
                      ，修改文字不会再次发币。
                    </p>
                  ) : null}
                  <SubmitButton className="mt-3" pendingText="正在送出回应…">
                    <MessageCircleHeart className="size-4" />
                    {response ? "更新回应文字" : "送出回应"}
                  </SubmitButton>
                </form>
              </Card>
            );
          })
        ) : (
          <Card className="py-14 text-center text-sm text-muted">
            还没有心情记录。
          </Card>
        )}
      </div>
    </div>
  );
}
