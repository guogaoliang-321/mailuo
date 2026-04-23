"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push("/login");
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`glass w-9 h-9 flex items-center justify-center transition-colors rounded-xl ${
          open ? "text-white/80" : "text-white/40 hover:text-white/70"
        }`}
      >
        <Settings className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 glass rounded-xl overflow-hidden py-1 min-w-[148px] z-50 shadow-xl">
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white/90 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            个人设置
          </Link>
          <div className="border-t border-white/[0.06] mx-3 my-0.5" />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400/70 hover:bg-white/5 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
