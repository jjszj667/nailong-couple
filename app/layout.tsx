import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const notoSans = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "JJ的快乐小屋",
    template: "%s｜JJ的快乐小屋",
  },
  description: "记录今天的心情、吃饭、愿望与纪念日，把两个人的小事收藏成快乐。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className={`${notoSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
