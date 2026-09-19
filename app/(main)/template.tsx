import { getLatestUnreadRelease } from "@/lib/data";
import { ReleasePopup } from "@/components/release-popup";
import { requireUser } from "@/lib/auth";

export default async function MainTemplate({ children }: { children: React.ReactNode }) {
  const [{ profile }, release] = await Promise.all([requireUser(), getLatestUnreadRelease()]);
  return <>{children}<ReleasePopup key={release?.id ?? "none"} release={release} userId={profile.id} /></>;
}
