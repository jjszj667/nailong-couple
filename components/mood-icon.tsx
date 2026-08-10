import Image from "next/image";
import { cn } from "@/lib/utils";

export function MoodIcon({ image, label, className, sizes = "40px" }: { image: string; label: string; className?: string; sizes?: string }) {
  return (
    <span className={cn("relative inline-block shrink-0 overflow-hidden rounded-full bg-white", className)}>
      <Image src={image} alt={`${label}的奶龙表情`} fill sizes={sizes} className="scale-[1.42] object-cover object-center" />
    </span>
  );
}
