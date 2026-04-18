"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

interface RequestItem {
  id: string;
  title: string;
  description: string;
  status: string;
  urgent?: boolean;
  initiatorName: string;
  initiatorId: string;
  projectName?: string;
  createdAt: string;
  responseCount?: number;
}

interface ResponseItem {
  id: string;
  userId: string;
  userName: string;
  type: string;
  message: string;
  accepted: boolean;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "待响应", color: "#FF9F0A" },
  relaying: { label: "转介中", color: "#5AC8FA" },
  fulfilled: { label: "已对接", color: "#30D158" },
  rejected: { label: "已关闭", color: "#FF375F" },
};

export default function RequestsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["requests"],
    queryFn: () => api.get<RequestItem[]>("/requests"),
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const requests = data?.data ?? [];

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="serif text-2xl font-semibold text-white">对接追踪</h1>
          <p className="text-sm mt-1 text-white/40">{requests.length} 条记录</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/requests/new" className="btn-gold inline-flex items-center gap-2 text-sm">
            + 发起对接
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl skeleton-dark" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <div className="text-3xl mb-3">⇌</div>
          <p className="text-sm text-white/50">暂无对接记录</p>
          <p className="text-xs text-white/25 mt-1">发起第一个资源对接请求吧</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              isMe={r.initiatorId === user?.id}
              expanded={expandedId === r.id}
              onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({
  request: r,
  isMe,
  expanded,
  onToggle,
}: {
  request: RequestItem;
  isMe: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const config = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;

  // Fetch responses when expanded
  const { data: responsesData } = useQuery({
    queryKey: ["request-responses", r.id],
    queryFn: () => api.get<ResponseItem[]>(`/requests/${r.id}/responses`),
    enabled: expanded,
  });
  const responses = responsesData?.data ?? [];

  // Build chain: initiator → responders (ordered by time)
  const chainNodes: Array<{
    name: string;
    role: string;
    done: boolean;
    time: string;
    color: string;
  }> = [
    {
      name: isMe ? "我" : r.initiatorName,
      role: "发起人",
      done: true,
      time: r.createdAt ? new Date(r.createdAt).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }) : "",
      color: "#D4A853",
    },
    ...responses.map((resp) => ({
      name: resp.userName,
      role: resp.type === "clue" ? "信息贡献" : "转介人",
      done: true,
      time: resp.created_at ? new Date(resp.created_at).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }) : "",
      color: resp.type === "clue" ? "#5AC8FA" : "#30D158",
    })),
  ];

  // If not fulfilled, add a "待确认" node
  if (r.status !== "fulfilled" && responses.length > 0) {
    chainNodes.push({
      name: "?",
      role: "资源方",
      done: false,
      time: "待确认",
      color: "rgba(255,255,255,0.3)",
    });
  }

  return (
    <div className="glass-card p-0 overflow-hidden" style={{ marginBottom: 0 }}>
      {/* Card header — clickable */}
      <div className="p-5 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between mb-2">
          <span className="text-[10px] text-white/20 tracking-[1.5px] font-mono">
            {r.projectName ?? r.id.slice(0, 10).toUpperCase()}
          </span>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: `${config.color}15`, color: config.color, border: `0.5px solid ${config.color}30` }}>
            {config.label}
          </span>
        </div>

        <h3 className="serif text-base font-bold text-white/90 leading-snug mb-3">{r.title}</h3>

        {/* Mini chain preview */}
        <div className="flex items-center gap-1">
          {chainNodes.map((node, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{
                  backgroundColor: node.done ? `${node.color}25` : "transparent",
                  border: `1.5px solid ${node.done ? node.color : "rgba(255,255,255,0.15)"}`,
                  color: node.done ? node.color : "rgba(255,255,255,0.3)",
                  boxShadow: node.done ? `0 0 8px ${node.color}22` : "none",
                }}>
                {node.done ? node.name[0] : node.name}
              </div>
              {i < chainNodes.length - 1 && (
                <div className="w-4 h-[1.5px] rounded-full"
                  style={{
                    backgroundColor: node.done && chainNodes[i + 1].done ? chainNodes[i + 1].color : "rgba(255,255,255,0.1)",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Expanded: detailed timeline */}
      {expanded && (
        <div className="border-t border-white/[0.06] p-5">
          <div className="space-y-0">
            {chainNodes.map((node, i) => {
              const isLast = i === chainNodes.length - 1;
              return (
                <div key={i} className="flex gap-3 relative" style={{ paddingBottom: isLast ? 0 : 24 }}>
                  {/* Vertical line */}
                  {!isLast && (
                    <div className="absolute left-[14px] top-[30px] bottom-0 w-[1.5px]"
                      style={{
                        background: node.done
                          ? `linear-gradient(to bottom, ${node.color}60, ${chainNodes[i + 1]?.done ? chainNodes[i + 1].color + "40" : "rgba(255,255,255,0.06)"})`
                          : "rgba(255,255,255,0.06)",
                      }}
                    />
                  )}
                  {/* Node circle */}
                  <div className="w-[30px] h-[30px] rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: node.done ? `${node.color}30` : "transparent",
                      border: `1.5px solid ${node.done ? node.color : "rgba(255,255,255,0.15)"}`,
                      color: node.done ? "#fff" : "rgba(255,255,255,0.3)",
                      boxShadow: node.done ? `0 0 14px ${node.color}33` : "none",
                    }}>
                    {node.done ? "✓" : i + 1}
                  </div>
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/90 font-semibold">{node.name}</span>
                      <span className="text-[10px] text-white/25">{node.time}</span>
                    </div>
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: `${node.color}15`, color: node.color, border: `0.5px solid ${node.color}30` }}>
                      {node.role}
                    </span>
                    {/* Show response message if available */}
                    {responses[i - 1]?.message && (
                      <p className="text-xs text-white/40 mt-1.5 leading-relaxed">
                        "{responses[i - 1].message}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="mt-4 pt-4 border-t border-white/[0.06] flex justify-end">
            <Link href={`/requests/${r.id}`} className="text-xs text-[#D4A853] hover:text-[#D4A853]/80 transition-colors">
              查看详情 / 响应 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
