"use client";

import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { MeshBG } from "@/components/mesh-bg";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A12]">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Loader2 className="w-8 h-8 text-[#D4A853] animate-spin" />
          <span className="text-sm text-white/40">加载中...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0A0A12]">
      <MeshBG />
      <Sidebar />
      <main className="relative z-10 pb-20 md:pb-0 md:ml-56">
        <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
