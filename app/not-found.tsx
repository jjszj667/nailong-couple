import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center text-center">
      <div><div className="text-6xl">🦕</div><h1 className="mt-4 text-3xl font-black text-brown">这个角落还没有布置好</h1><p className="mt-2 text-muted">换个地方看看吧。</p><Link href="/" className="pill-button mt-6">回到首页</Link></div>
    </main>
  );
}
