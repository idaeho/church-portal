"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const nav = [
  { group: "입력", items: [
    { href: "/offerings", label: "헌금 입력", badge: "헌금" },
    { href: "/expenses", label: "지출 입력", badge: "지출" },
  ]},
  { group: "조회", items: [
    { href: "/dashboard", label: "대시보드", badge: null },
    { href: "/income",    label: "수입내역",  badge: "AUTO" },
    { href: "/expense-view", label: "지출내역", badge: "AUTO" },
    { href: "/account-book", label: "헌금대장", badge: "🔒" },
  ]},
  { group: "출력", items: [
    { href: "/weekly-report", label: "주간결산 보고서", badge: null },
    { href: "/account-mgmt", label: "통장 관리", badge: null },
  ]},
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-[#1e293b] flex flex-col text-sm z-20">
      {/* 헤더 */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="text-white font-bold text-lg">꿈꾸는교회</div>
        <div className="mt-1">
          <span className="bg-primary text-white text-xs px-2 py-0.5 rounded font-medium">
            2026년 재정관리
          </span>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {nav.map((group) => (
          <div key={group.group} className="mb-5">
            <div className="text-white/40 text-xs font-semibold uppercase tracking-wider px-2 mb-2">
              {group.group}
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg mb-0.5 transition-colors
                    ${active
                      ? "bg-primary text-white font-semibold"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold
                      ${item.badge === "헌금" ? "bg-emerald-500 text-white" :
                        item.badge === "지출" ? "bg-amber-500 text-white" :
                        item.badge === "AUTO" ? "bg-sky-500/30 text-sky-300" :
                        item.badge === "🔒" ? "" : "bg-white/10 text-white/60"
                      }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {/* 관리자 메뉴 */}
        {session && (
          <div className="mb-5">
            <div className="text-white/40 text-xs font-semibold uppercase tracking-wider px-2 mb-2">관리</div>
            <Link href="/admin"
              className={`flex items-center px-3 py-2 rounded-lg mb-0.5 text-white/70 hover:bg-white/10 hover:text-white
                ${pathname === "/admin" ? "bg-primary text-white" : ""}`}>
              관리자 설정
            </Link>
          </div>
        )}
      </nav>

      {/* 하단 사용자 정보 */}
      <div className="px-4 py-4 border-t border-white/10">
        {session ? (
          <div className="flex items-center justify-between">
            <div className="text-white/70 text-xs truncate">{session.user?.email}</div>
            <button onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-white/40 hover:text-white text-xs ml-2 shrink-0">
              로그아웃
            </button>
          </div>
        ) : (
          <Link href="/login" className="text-white/60 hover:text-white text-xs">로그인</Link>
        )}
      </div>
    </aside>
  );
}
