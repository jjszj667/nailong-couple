"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, Heart } from "lucide-react";
import { saveMoodAction } from "@/app/actions";
import { MOODS, MOOD_TAGS } from "@/lib/life";
import type { Mood } from "@/types/database";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";

export function MoodSelector({ date, mood, returnTo = "/" }: { date: string; mood?: Mood | null; returnTo?: string }) {
  const [value, setValue] = useState(mood?.value ?? "neutral");
  const current = MOODS.find((item) => item.value === value) ?? MOODS[3];
  return (
    <form action={saveMoodAction}>
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="value" value={value} />
      <input type="hidden" name="return_to" value={returnTo} />
      <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-amber-50 to-orange-50 px-4 py-5 text-center">
        <div className="absolute inset-x-8 bottom-4 h-12 rounded-full opacity-25 blur-2xl" style={{ backgroundColor: current.color }} />
        <div className="relative mx-auto size-32">
          <Image src="/nailong/nailong-3d.png" alt="奶龙心情占位形象" fill sizes="128px" className="object-contain drop-shadow-md transition-transform duration-300" />
          <span className="absolute -right-1 top-1 flex size-11 items-center justify-center rounded-full border-4 border-white bg-white text-2xl shadow-md" aria-hidden>{current.emoji}</span>
        </div>
        <p className="relative mt-2 text-xl font-black text-brown">{current.label}</p>
        <p className="relative mt-1 text-xs text-muted">轻轻点一下，选出今天最接近的感觉</p>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5" aria-label="心情选择器">
        {MOODS.map((item) => (
          <button key={item.value} type="button" onClick={() => setValue(item.value)} aria-label={item.label} aria-pressed={value === item.value}
            className={cn("flex min-h-14 flex-col items-center justify-center rounded-2xl border text-lg transition", value === item.value ? "scale-[1.04] border-amber-400 bg-amber-100 shadow-sm" : "border-transparent bg-stone-50 hover:bg-amber-50")}
          >
            <span>{item.emoji}</span><span className="mt-0.5 hidden text-[9px] font-semibold text-muted sm:block">{item.label}</span>
          </button>
        ))}
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-bold text-brown">今天发生了什么？<span className="ml-1 font-normal text-muted">可选，最多 8 个</span></legend>
        <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
          {MOOD_TAGS.map((tag) => (
            <label key={tag} className="relative cursor-pointer">
              <input type="checkbox" name="tags" value={tag} defaultChecked={mood?.tags.includes(tag)} className="peer sr-only" />
              <span className="inline-flex min-h-9 items-center gap-1 rounded-full border border-line bg-white px-3 text-xs font-medium text-muted transition peer-checked:border-amber-400 peer-checked:bg-amber-100 peer-checked:text-brown">
                <Check className="hidden size-3 peer-checked:block" />{tag}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-5 block text-sm font-bold text-brown">给今天留一句备注<span className="ml-1 font-normal text-muted">可选</span>
        <textarea name="note" className="field mt-2 min-h-24 resize-y" maxLength={500} defaultValue={mood?.note ?? ""} placeholder="不用分析自己，只写此刻想留下的话。" />
      </label>
      <SubmitButton className="mt-4 w-full" pendingText="正在收藏心情…"><Heart className="size-4" />{mood ? "更新今天的心情" : "收藏今天的心情"}</SubmitButton>
    </form>
  );
}
