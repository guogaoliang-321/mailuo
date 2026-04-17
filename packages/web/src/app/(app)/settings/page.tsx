"use client";

import { useAuth } from "@/lib/auth";
import { User, Mail, Shield, Users } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white/90">个人设置</h1>
        <p className="text-sm text-white/40 mt-0.5">查看你的账号信息</p>
      </div>

      <div className="glass-card p-6 max-w-lg space-y-5">
        <div className="flex items-center gap-4 pb-5 border-b border-white/[0.06]">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4A853]/60 to-[#D4A853]/30 flex items-center justify-center text-white text-xl font-bold">
            {user?.displayName?.charAt(0) ?? "?"}
          </div>
          <div>
            <div className="text-lg font-semibold text-white/90">
              {user?.displayName}
            </div>
            <span
              className={`badge mt-1 ${user?.role === "admin" ? "bg-[#D4A853]/15 text-[#D4A853]" : "bg-gray-100 text-white/50"}`}
            >
              {user?.role === "admin" ? (
                <>
                  <Shield className="w-3 h-3 mr-1" />
                  管理员
                </>
              ) : (
                <>
                  <Users className="w-3 h-3 mr-1" />
                  成员
                </>
              )}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <User className="w-4 h-4 text-white/40" />
            </div>
            <div>
              <label className="block text-xs text-white/30">显示名称</label>
              <p className="text-sm font-medium text-white/90">
                {user?.displayName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <Mail className="w-4 h-4 text-white/40" />
            </div>
            <div>
              <label className="block text-xs text-white/30">邮箱地址</label>
              <p className="text-sm font-medium text-white/90">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
