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
  return <img src={src || "/nailong/nailong-placeholder.svg"} alt={alt} className={cn("object-cover", className)} />;
}
