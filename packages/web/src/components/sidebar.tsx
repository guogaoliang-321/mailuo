"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

const navItems = [
  { href: "/", label: "网络", icon: "◎" },
  { href: "/my", label: "我的", icon: "♦" },
  { href: "/projects", label: "项目池", icon: "◈" },
  { href: "/relationships", label: "关系池", icon: "◇" },
  { href: "/requests", label: "对接流", icon: "⇌" },
  { href: "/circles", label: "圈子", icon: "⊙" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass" style={{ borderRadius: "18px 18px 0 0", borderBottom: "none" }}>
        <div className="flex justify-around py-2 pb-[max(8px,env(safe-area-inset-bottom))]">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 px-3 py-1.5"
              >
                <span className={`text-lg ${active ? "text-[#D4A853]" : "text-white/30"}`}>{item.icon}</span>
                <span className={`text-[10px] font-medium ${active ? "text-[#D4A853]" : "text-white/30"}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-56 z-40 flex-col glass" style={{ borderRadius: 0, borderLeft: "none", borderTop: "none", borderBottom: "none" }}>
        <div className="p-6">
          <h1 className="serif text-2xl font-extrabold text-white/90 tracking-[4px]">脉 络</h1>
          <p className="text-[9px] text-white/30 tracking-[5px] font-medium mt-0.5">MERIDIAN</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                  active
                    ? "bg-white/10 text-[#D4A853]"
                    : "text-white/50 hover:bg-white/5 hover:text-white/70"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}

          {user?.role === "admin" && (
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                pathname === "/admin"
                  ? "bg-white/10 text-[#D4A853]"
                  : "text-white/50 hover:bg-white/5 hover:text-white/70"
              }`}
            >
              <span className="text-base">⚙</span>
              <span className="font-medium">管理</span>
            </Link>
          )}
        </nav>

        {user && (
          <div className="p-4 border-t border-white/[0.08]">
            <Link href="/settings" className="flex items-center gap-2.5 group mb-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4A853]/60 to-[#D4A853]/30 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {user.displayName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white/70 truncate group-hover:text-white/90 transition-colors">
                  {user.displayName}
                </div>
                <div className="text-[10px] text-white/30 truncate">{user.email}</div>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-white/5 transition-colors text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              退出登录
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
