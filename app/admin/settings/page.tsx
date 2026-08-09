import { updateSettingsAction } from "@/app/actions";
import { getAdminSettings } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Flash } from "@/components/ui/flash";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [settings, flash] = await Promise.all([getAdminSettings(), searchParams]);
  const value = (key: string) => settings.find((item) => item.key === key)?.value ?? 0;
  const fields = [["lunch_reward", "午间限时签到奖励"], ["dinner_reward", "晚间限时签到奖励"], ["daily_complete_reward", "完整签到奖励"], ["streak_7_reward", "连续 7 天奖励"], ["streak_30_reward", "连续 30 天奖励"]] as const;
  return <div><div className="mb-5"><h2 className="text-xl font-black text-brown">系统设置</h2><p className="mt-1 text-sm text-muted">新规则只影响之后产生的签到，不会改写历史流水。</p></div><Flash {...flash} /><Card><form action={updateSettingsAction} className="space-y-4">{fields.map(([key, label]) => <label key={key} className="grid items-center gap-2 rounded-2xl bg-amber-50 p-4 sm:grid-cols-[1fr_10rem]"><span><span className="block text-sm font-bold text-brown">{label}</span><span className="mt-1 block text-xs text-muted">单位：奶龙币</span></span><input name={key} type="number" min={0} step={1} className="field" defaultValue={value(key)} required /></label>)}<SubmitButton pendingText="正在保存规则…">保存全部设置</SubmitButton></form></Card></div>;
}
