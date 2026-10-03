import { CircleAlert, CircleCheck } from "lucide-react";
import { RewardFeedback } from "@/components/motion/reward-feedback";
import { NiwaMotif } from "@/components/ui/niwa-motif";

export function Flash({ ok, error, feedback, earned, receipt }: { ok?: string; error?: string; feedback?: string; earned?: string; receipt?: string }) {
  if (!ok && !error) return null;
  const success = Boolean(ok);
  const kind = feedback === "normal" || feedback === "makeup" ? feedback : ok?.includes("兑换申请") ? "redeem" : ok?.includes("心情") ? "mood" : null;
  const rawAmount = earned === undefined ? undefined : Number(earned);
  const amount = rawAmount !== undefined && Number.isSafeInteger(rawAmount) && rawAmount >= 0 && rawAmount <= 10000000 ? rawAmount : undefined;
  return (
    <><div role={success ? "status" : "alert"} className={`niwa-flash relative mb-5 flex items-start gap-2 overflow-hidden rounded-2xl border px-4 py-3 text-sm ${success ? "success-pop border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
      {success ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <CircleAlert className="mt-0.5 size-4 shrink-0" />}
      <span className="flex-1 pr-10">{ok || error}</span>
      {success && <NiwaMotif className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-gold" />}
    </div>{success && kind && <RewardFeedback kind={kind} amount={amount} receipt={receipt} />}</>
  );
}
