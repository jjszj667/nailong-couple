import Image from "next/image";
import { cn } from "@/lib/utils";

export function MoodIcon({ image, label, className, sizes = "40px" }: { image: string; label: string; className?: string; sizes?: string }) {
  return (
    <span className={cn("mood-icon relative inline-block shrink-0", className)}>
      <Image src={image} alt={`${label}的奶龙表情`} fill sizes={sizes} className="object-contain object-center" />
    </span>
  );
}
