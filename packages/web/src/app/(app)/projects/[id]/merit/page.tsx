"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

interface MeritEvent {
  id: string;
  action: string;
  role: string;
  userId: string;
  userName: string;
  timestamp: string;
  hash: string;
}

interface BenefitAgreement {
  id: string;
  projectId: string;
  status: string;
  distribution: Array<{
    userId: string;
    displayName?: string;
    role: string;
    percentage: number;
    confirmed: boolean;
  }>;
  lockedAt: string | null;
}

interface ProjectDetail {
  id: string;
  name: string;
}

const ROLE_LABELS: Record<string, string> = {
  info_contributor: "信息贡献方",
  request_initiator: "请求发起人",
  relay_intermediary: "协助转介人",
  resource_provider: "资源提供方",
};

const ROLE_COLORS: Record<string, string> = {
  info_contributor: "#D4A853",
  request_initiator: "#5AC8FA",
  relay_intermediary: "#BF5AF2",
  resource_provider: "#30D158",
};

export default function MeritPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: projectData } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.get<ProjectDetail>(`/projects/${projectId}`),
  });

  const { data: meritData } = useQuery({
    queryKey: ["merit", projectId],
    queryFn: () => api.get<{ chain: MeritEvent[]; verified: boolean }>(`/merit/project/${projectId}`),
  });

  const chain = meritData?.data?.chain ?? [];
  const verified = meritData?.data?.verified ?? false;
  const project = projectData?.data;

  // Group by role for the donut chart
  const roleGroups = chain.reduce((acc, e) => {
    if (!acc[e.role]) acc[e.role] = [];
    acc[e.role].push(e);
    return acc;
  }, {} as Record<string, MeritEvent[]>);

  const uniqueContributors = [...new Map(chain.map((e) => [e.userId, e])).values()];

  // SVG donut chart data
  const totalContributors = uniqueContributors.length;
  const sharePerContributor = totalContributors > 0 ? 100 / totalContributors : 0;

  const confirmMutation = useMutation({
    mutationFn: () => api.post(`/merit/project/${projectId}/confirm`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["merit", projectId] }),
  });

  return (
    <div className="space-y-5 max-w-2xl page-enter">
      {/* Header */}
      <div>
        <Link href={`/projects/${projectId}`} className="text-sm text-[#D4A853]/70 hover:text-[#D4A853] transition-colors">← 返回项目</Link>
        <h1 className="serif text-xl font-bold text-white/95 mt-2">功劳链</h1>
        <p className="text-sm text-white/40 mt-1">{project?.name ?? "加载中..."}</p>
      </div>

      {chain.length === 0 ? (
        <div className="glass-card text-center py-12" style={{ marginBottom: 0 }}>
          <div className="text-3xl mb-3">📊</div>
          <p className="text-sm text-white/40">暂无功劳链记录</p>
          <p className="text-xs text-white/25 mt-1">当项目有对接请求并完成后，功劳链会自动生成</p>
        </div>
      ) : (
        <>
          {/* Donut Chart */}
          <div className="glass-card p-6" style={{ marginBottom: 0 }}>
            <div className="flex justify-center mb-6">
              <svg width="200" height="200" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="82" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2" />
                {(() => {
                  let offset = 0;
                  return uniqueContributors.map((contributor, i) => {
                    const circ = 2 * Math.PI * 82;
                    const pct = sharePerContributor;
                    const dash = (pct / 100) * circ;
                    const rot = (offset / 100) * 360 - 90;
                    offset += pct;
                    const color = ROLE_COLORS[contributor.role] ?? "#5AC8FA";
                    return (
                      <circle
                        key={contributor.userId}
                        cx="100" cy="100" r="82"
                        fill="none"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${dash} ${circ - dash}`}
                        transform={`rotate(${rot} 100 100)`}
                        style={{ filter: `drop-shadow(0 0 8px ${color}44)` }}
                      />
                    );
                  });
                })()}
                <text x="100" y="90" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="14" fontWeight="700" fontFamily="serif">
                  {verified ? "已验证" : "待验证"}
                </text>
                <text x="100" y="112" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="11">
                  {chain.length} 步贡献
                </text>
              </svg>
            </div>

            {/* Contributors list */}
            <div className="space-y-2.5">
              {uniqueContributors.map((c) => {
                const color = ROLE_COLORS[c.role] ?? "#5AC8FA";
                return (
                  <div key={c.userId} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                    <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold"
                      style={{
                        backgroundColor: `${color}22`,
                        border: `1.5px solid ${color}55`,
                        color,
                        boxShadow: `0 0 16px ${color}33`,
                      }}>
                      {c.userName[0]}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-white/90 font-semibold">{c.userName}</div>
                      <div className="text-[11px] text-white/40 mt-0.5">{ROLE_LABELS[c.role] ?? c.role}</div>
                    </div>
                    <div className="text-xl font-extrabold" style={{ color }}>
                      {Math.round(sharePerContributor)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hash chain verification */}
          <div className="glass-card p-4 text-center" style={{
            marginBottom: 0,
            borderColor: verified ? "rgba(48,209,88,0.2)" : "rgba(255,159,10,0.2)",
          }}>
            <span className="text-sm" style={{ color: verified ? "#30D158" : "#FF9F0A" }}>
              {verified ? "✓ 哈希链验证通过，记录不可篡改" : "⚠ 哈希链验证中..."}
            </span>
          </div>

          {/* Timeline */}
          <div className="glass-card p-5" style={{ marginBottom: 0 }}>
            <div className="text-sm font-semibold text-white/80 mb-4">📜 完整时间线</div>
            <div className="space-y-0">
              {chain.map((event, i) => {
                const color = ROLE_COLORS[event.role] ?? "#5AC8FA";
                return (
                  <div key={event.id} className="flex gap-3 relative" style={{ paddingBottom: i < chain.length - 1 ? 20 : 0 }}>
                    {i < chain.length - 1 && (
                      <div className="absolute left-[14px] top-[28px] bottom-0 w-[1.5px]"
                        style={{ background: `linear-gradient(to bottom, ${color}40, ${color}10)` }}
                      />
                    )}
                    <div className="w-[30px] h-[30px] rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: `${color}25`,
                        border: `1.5px solid ${color}`,
                        color: "#fff",
                        boxShadow: `0 0 12px ${color}33`,
                      }}>
                      ✓
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/80 font-medium">{event.userName}</span>
                        <span className="text-[10px] text-white/25">{new Date(event.timestamp).toLocaleString("zh-CN")}</span>
                      </div>
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: `${color}15`, color, border: `0.5px solid ${color}30` }}>
                        {ROLE_LABELS[event.role] ?? event.role}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
