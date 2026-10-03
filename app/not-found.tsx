import Link from "next/link";
import { NailongCompanion } from "@/components/nailong-companion";

export default function NotFound() {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center text-center">
      <div><NailongCompanion pose="travel" className="mx-auto size-40" /><h1 className="mt-4 text-3xl font-black text-brown">这个角落还没有布置好</h1><p className="mt-2 text-muted">换个地方看看吧。</p><Link href="/" className="pill-button mt-6">回到首页</Link></div>
    </main>
  );
}
