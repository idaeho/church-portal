"use client";
import { Sidebar } from "./Sidebar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface Props {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  requireAuth?: boolean;
}

export function PageWrapper({ children, title, subtitle, requireAuth = true }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();

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
      <Sidebar />
      <main className="ml-[260px] flex-1 min-h-screen">
        {/* 상단 헤더 */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="text-sm text-slate-400 font-medium">
            {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
          </div>
        </header>

        {/* 콘텐츠 */}
        <div className="px-8 py-6">{children}</div>
      </main>
    </div>
  );
}
