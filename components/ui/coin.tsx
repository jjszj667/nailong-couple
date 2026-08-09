import Image from "next/image";
import { formatCoins } from "@/lib/utils";

export function Coin({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold tabular-nums text-brown ${className}`}>
      <Image src="/nailong/coin-3d.png" alt="奶龙币" width={22} height={22} className="object-contain" />
      {formatCoins(value)}
    </span>
  );
}
