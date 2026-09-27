"use client";

import Image from "next/image";
import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { Check, Heart } from "lucide-react";
import { saveMoodAction } from "@/app/actions";
import { MOODS, MOOD_TAGS } from "@/lib/life";
import type { Mood } from "@/types/database";
import { MoodIcon } from "@/components/mood-icon";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";

const messages = [
  "不用急着好起来，先给自己一个拥抱。", "难过也可以被温柔接住，我在这里。",
  "今天有一点点累，那就慢慢来。", "平平淡淡，也是舒服的一天。",
  "一点点小确幸，也值得被记住。", "把这份好心情，分一点给喜欢的人。", "今天的快乐，值得一个大大的拥抱！",
];

export function MoodSelector({ date, mood, returnTo = "/" }: { date: string; mood?: Mood | null; returnTo?: string }) {
  const [value, setValue] = useState(mood?.value ?? "neutral");
  const [tags, setTags] = useState<string[]>(mood?.tags ?? []);
  const index = MOODS.findIndex((item) => item.value === value);
  const current = MOODS[index];
  function onKey(event: KeyboardEvent<HTMLButtonElement>, i: number) {
    const next = event.key === "Home" ? 0 : event.key === "End" ? 6 : ["ArrowRight", "ArrowDown"].includes(event.key) ? (i + 1) % 7 : ["ArrowLeft", "ArrowUp"].includes(event.key) ? (i + 6) % 7 : -1;
    if (next < 0) return;
    event.preventDefault();
    setValue(MOODS[next].value);
    (event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
  }
  return <form action={saveMoodAction} className="mood-composer" style={{ "--mood-color": current.color } as CSSProperties}>
    <input type="hidden" name="date" value={date} /><input type="hidden" name="value" value={value} /><input type="hidden" name="return_to" value={returnTo} />
    <div className="mood-stage">
      <span className="mood-orbit" aria-hidden="true" />
      <div key={value} className={`mood-character mood-energy-${index}`}><Image src={current.image} alt={`${current.label}的奶龙`} fill sizes="(max-width: 640px) 170px, 210px" className="object-contain" /></div>
      <div className="mood-stage-copy" aria-live="polite"><span className="eyebrow">HOW ARE YOU, REALLY?</span><p className="mood-current-label">{current.label}</p><p>{messages[index]}</p></div>
    </div>
    <div className="mood-options" role="radiogroup" aria-label="今天的心情">
      {MOODS.map((item, i) => <button key={item.value} type="button" role="radio" aria-checked={value === item.value} tabIndex={value === item.value ? 0 : -1} onClick={() => setValue(item.value)} onKeyDown={(event) => onKey(event, i)} className={cn("mood-option", value === item.value && "is-selected")}>
        <MoodIcon image={item.image} label={item.label} className="mood-option-icon" sizes="64px" /><span>{item.label}</span><span className="mood-option-dot" aria-hidden="true" />
      </button>)}
    </div>
    <fieldset className="mt-6"><legend className="text-sm font-semibold text-brown">是什么让你有这种感觉？ <span className="font-normal text-muted">{tags.length}/8 · 可选</span></legend>
      <div className="mood-tags mt-3 flex flex-wrap gap-2">{MOOD_TAGS.map((tag) => <label key={tag} className="relative cursor-pointer"><input type="checkbox" name="tags" value={tag} checked={tags.includes(tag)} disabled={!tags.includes(tag) && tags.length >= 8} onChange={(event) => setTags(event.target.checked ? [...tags, tag] : tags.filter((item) => item !== tag))} className="peer sr-only" /><span className="mood-tag"><Check className="size-3" />{tag}</span></label>)}</div>
    </fieldset>
    <label className="mt-6 block text-sm font-semibold text-brown">还有什么想说的？<span className="ml-2 font-normal text-muted">可选</span><textarea name="note" className="field mt-3 min-h-24 resize-y" maxLength={500} defaultValue={mood?.note ?? ""} placeholder="不必组织语言，写下此刻的感受就好。" /></label>
    <SubmitButton className="mt-4 w-full" pendingText="正在收藏这份心情…"><Heart className="size-4" />{mood ? "更新今天的心情" : "收藏今天的心情"}</SubmitButton>
  </form>;
}
