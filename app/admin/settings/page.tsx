import { saveRelationshipAction, updateSettingsAction } from "@/app/actions";
import { getAdminSettings } from "@/lib/data";
import { getRelationshipData } from "@/lib/life-data";
import { Card } from "@/components/ui/card";
import { Flash } from "@/components/ui/flash";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [settings, relationship, flash] = await Promise.all([
    getAdminSettings(),
    getRelationshipData(),
    searchParams,
  ]);
  const value = (key: string) =>
    settings.find((item) => item.key === key)?.value ?? 0;
  const fields = [
    ["lunch_reward", "午间限时签到奖励"],
    ["dinner_reward", "晚间限时签到奖励"],
    ["daily_complete_reward", "完整签到奖励"],
    ["streak_7_reward", "连续 7 天奖励"],
    ["streak_30_reward", "连续 30 天奖励"],
    ["mood_checkin_reward", "每日首次心情奖励"],
  ] as const;
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-black text-brown">系统设置</h2>
        <p className="mt-1 text-sm text-muted">
          新规则只影响之后产生的记录，不会改写历史流水。
        </p>
      </div>
      <Flash {...flash} />
      <div className="space-y-6">
        <Card>
          <h3 className="mb-4 font-black text-brown">我们的纪念日</h3>
          <form action={saveRelationshipAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-brown">
                关系标题
                <input
                  name="relationship_title"
                  className="field mt-2"
                  defaultValue={relationship.settings?.title ?? "我们认识"}
                  maxLength={30}
                  required
                />
              </label>
              <label className="block text-sm font-semibold text-brown">
                开始日期
                <input
                  name="relationship_start_date"
                  type="date"
                  className="field mt-2"
                  defaultValue={relationship.settings?.start_date ?? ""}
                  required
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["a", "b"] as const).map((side) => (
                <label
                  key={side}
                  className="block text-sm font-semibold text-brown"
                >
                  关系成员 {side.toUpperCase()}
                  <select
                    name={`partner_${side}_id`}
                    className="field mt-2"
                    defaultValue={
                      side === "a"
                        ? (relationship.settings?.partner_a_id ?? "")
                        : (relationship.settings?.partner_b_id ?? "")
                    }
                  >
                    <option value="">暂不指定</option>
                    {relationship.profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.nickname}（{profile.role}）
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted">
              前台只显示双方昵称；admin / user 仅用于后台权限与安全控制。
            </p>
            <SubmitButton pendingText="保存中…">保存关系设置</SubmitButton>
          </form>
        </Card>
        <Card>
          <h3 className="mb-4 font-black text-brown">奶龙币奖励规则</h3>
          <form action={updateSettingsAction} className="space-y-4">
            {fields.map(([key, label]) => (
              <label
                key={key}
                className="grid items-center gap-2 rounded-2xl bg-amber-50 p-4 sm:grid-cols-[1fr_10rem]"
              >
                <span>
                  <span className="block text-sm font-bold text-brown">
                    {label}
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    单位：奶龙币
                  </span>
                </span>
                <input
                  name={key}
                  type="number"
                  min={0}
                  step={1}
                  className="field"
                  defaultValue={value(key)}
                  required
                />
              </label>
            ))}
            <SubmitButton pendingText="正在保存规则…">
              保存全部设置
            </SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
