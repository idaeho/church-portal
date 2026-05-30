"use client";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Menu } from "lucide-react";

interface Props {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  requireAuth?: boolean;
}

export function PageWrapper({ children, title, subtitle, requireAuth = true }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (requireAuth && status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, requireAuth, router]);

  if (requireAuth && status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm">로딩 중...</div>
      </div>
    );
  }

  if (requireAuth && !session) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* 데스크톱: 260px 마진 / 모바일: 마진 없음 */}
      <main className="md:ml-[260px] flex-1 min-h-screen w-0">
        {/* 상단 헤더 */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 모바일 햄버거 */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-600 hover:text-slate-900 p-1 -ml-1"
              aria-label="메뉴 열기"
            >
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-800">{title}</h1>
              {subtitle && <p className="text-xs md:text-sm text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <div className="text-xs md:text-sm text-slate-400 font-medium hidden sm:block">
            {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
          </div>
        </header>

        {/* 콘텐츠 */}
        <div className="px-4 md:px-8 py-4 md:py-6">{children}</div>
      </main>
    </div>
  );
}
