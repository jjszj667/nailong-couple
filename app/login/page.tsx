import Image from "next/image";
import { redirect } from "next/navigation";
import { Heart, KeyRound, Mail } from "lucide-react";
import { loginAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { Flash } from "@/components/ui/flash";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "登录" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { error } = await searchParams;
  const configured = hasSupabaseEnv();

  return (
    <main className="page-shell flex min-h-screen items-center justify-center py-10">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-[2.5rem] border border-line bg-milk shadow-[0_25px_80px_rgba(111,79,27,0.13)] md:grid-cols-[1.05fr_1fr]">
        <div className="relative flex min-h-72 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#fff3b8] to-[#f6c84c] p-8 text-center md:min-h-[38rem]">
          <div className="absolute -left-16 top-8 size-48 rounded-full bg-white/25" />
          <div className="absolute -right-16 bottom-8 size-56 rounded-full bg-orange/15" />
          <Image src="/nailong/nailong-placeholder.svg" alt="自制奶龙风格占位形象" width={180} height={180} priority className="floaty relative rounded-[3rem] shadow-xl" />
          <h1 className="relative mt-6 text-3xl font-black tracking-tight text-brown">奶龙情侣点单站</h1>
          <p className="relative mt-3 max-w-xs leading-7 text-brown/75">把认真吃饭的小日常，慢慢攒成一起去做的开心事。</p>
        </div>

        <div className="flex flex-col justify-center p-6 sm:p-10">
          <div className="mb-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800"><Heart className="size-3.5 fill-current" />只属于两个人的小世界</div>
            <h2 className="text-3xl font-black tracking-tight text-brown">欢迎回来呀～</h2>
            <p className="mt-2 text-sm text-muted">登录后看看今天有没有好好吃饭。</p>
          </div>
          <Flash error={error} />
          {configured ? (
            <form action={loginAction} className="space-y-5">
              <label className="block text-sm font-semibold text-brown">邮箱
                <span className="relative mt-2 block"><Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" /><input className="field pl-11" type="email" name="email" autoComplete="email" required placeholder="you@example.com" /></span>
              </label>
              <label className="block text-sm font-semibold text-brown">密码
                <span className="relative mt-2 block"><KeyRound className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" /><input className="field pl-11" type="password" name="password" autoComplete="current-password" required minLength={6} placeholder="输入密码" /></span>
              </label>
              <SubmitButton className="w-full" pendingText="正在打开小世界…">登录</SubmitButton>
            </form>
          ) : (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
              <p className="font-bold">项目代码已经准备好，Supabase 还没有连接。</p>
              <p className="mt-1">请复制 <code className="rounded bg-white px-1.5 py-0.5">.env.example</code> 为 <code className="rounded bg-white px-1.5 py-0.5">.env.local</code> 并填写项目 URL 与 anon key，具体步骤见 README。</p>
            </div>
          )}
          <p className="mt-8 text-center text-xs text-muted">本站不开放注册 · 账号由你们自己在 Supabase 创建</p>
        </div>
      </section>
    </main>
  );
}
