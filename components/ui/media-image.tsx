import { cn } from "@/lib/utils";

export function MediaImage({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  // Supabase signed URLs have a runtime hostname, so a native image is more reliable here.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src || "/nailong/nailong-3d.png"} alt={alt} className={cn(src ? "object-cover" : "bg-amber-50 object-contain p-2", className)} />;
}
