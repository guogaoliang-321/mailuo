"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import {
  Ticket,
  Users,
  FileText,
  Copy,
  Check,
  Plus,
  Shield,
} from "lucide-react";

interface InviteItem {
  id: string;
  code: string;
  maxUses: number;
  useCount: number;
  expiresAt: string | null;
  createdAt: string;
}

interface UserItem {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"invites" | "users" | "audit">(
    "invites",
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: invites } = useQuery({
    queryKey: ["admin", "invites"],
    queryFn: () => api.get<InviteItem[]>("/admin/invites"),
  });

  const { data: users } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => api.get<UserItem[]>("/admin/users"),
  });

  const createInvite = useMutation({
    mutationFn: () =>
      api.post("/admin/invites", { maxUses: 1, expiresInDays: 7 }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "invites"] }),
  });

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const tabs = [
    { key: "invites" as const, label: "邀请码", icon: Ticket },
    { key: "users" as const, label: "用户", icon: Users },
    { key: "audit" as const, label: "审计日志", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white/90">管理后台</h1>
        <p className="text-sm text-white/40 mt-0.5">系统管理与配置</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.06] rounded-xl w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === t.key
                  ? "bg-white/10 text-white/90 shadow-sm"
                  : "text-white/40 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "invites" && (
        <div className="space-y-4">
          <button
            onClick={() => createInvite.mutate()}
            disabled={createInvite.isPending}
            className="btn-gold"
          >
            <Plus className="w-4 h-4" />
            {createInvite.isPending ? "生成中..." : "生成邀请码"}
          </button>

          <div className="space-y-2">
            {(invites?.data ?? []).map((inv) => (
              <div
                key={inv.id}
                className="glass-card p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <code className="text-sm font-mono bg-[#D4A853]/10 text-[#D4A853] px-3 py-1.5 rounded-lg">
                    {inv.code}
                  </code>
                  <button
                    onClick={() => copyCode(inv.code)}
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                    title="复制"
                  >
                    {copiedCode === inv.code ? (
                      <Check className="w-4 h-4 text-[#30D158]" />
                    ) : (
                      <Copy className="w-4 h-4 text-white/30" />
                    )}
                  </button>
                  <span className="text-xs text-white/30">
                    {inv.useCount}/{inv.maxUses} 已使用
                  </span>
                </div>
                <span className="text-xs text-white/30">
                  {inv.expiresAt
                    ? `${new Date(inv.expiresAt).toLocaleDateString("zh-CN")} 过期`
                    : "永不过期"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-2">
          {(users?.data ?? []).map((u) => (
            <div
              key={u.id}
              className="glass-card p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5AC8FA]/20 to-[#5AC8FA]/10 flex items-center justify-center text-[#5AC8FA] text-xs font-bold">
                  {u.displayName.charAt(0)}
                </div>
                <div>
                  <span className="font-medium text-sm text-white/90">
                    {u.displayName}
                  </span>
                  <span className="text-xs text-white/30 ml-2">
                    {u.email}
                  </span>
                </div>
              </div>
              <span
                className={`badge ${u.role === "admin" ? "bg-[#D4A853]/15 text-[#D4A853]" : "bg-white/[0.06] text-white/50"}`}
              >
                {u.role === "admin" ? (
                  <>
                    <Shield className="w-3 h-3 mr-1" /> 管理员
                  </>
                ) : (
                  "成员"
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "audit" && (
        <div className="glass-card empty-state">
          <FileText className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-white/40">
            审计日志查看功能
          </p>
          <p className="text-xs text-white/30 mt-1">开发中...</p>
        </div>
      )}
    </div>
  );
}
