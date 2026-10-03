"use client";
import { NailongCompanion } from "@/components/nailong-companion";
import { mobileCompanionPoses } from "@/lib/companion-motion";

/** Dev-only gallery, reached exclusively from the gated design-preview page. */
export function MobileCompanionGallery() {
  return <section className="space-y-4" aria-label="六种新增手机角色"><h2 className="text-xl font-black">手机也看得见的小伙伴</h2><p className="text-sm text-muted">跳舞、气球、雨衣、厨师、园艺、抱星星；可见时播放，离屏暂停。</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{mobileCompanionPoses.map(pose => <div key={pose} className="soft-card p-4"><NailongCompanion pose={pose} className="mx-auto w-full max-w-44" /><p className="mt-2 text-center text-xs">{pose}</p></div>)}</div></section>;
}
