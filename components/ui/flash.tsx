import { CircleAlert, CircleCheck } from "lucide-react";

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  const success = Boolean(ok);
  return (
    <div className={`relative mb-5 flex items-start gap-2 overflow-hidden rounded-2xl border px-4 py-3 text-sm ${success ? "success-pop border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
      {success ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <CircleAlert className="mt-0.5 size-4 shrink-0" />}
      <span>{ok || error}</span>
      {success && <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base">✨ 🪙</span>}
    </div>
  );
}
