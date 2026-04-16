"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

interface RequestDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  urgent?: boolean;
  timeAgo?: string;
  initiatorId: string;
  initiatorName: string;
  projectName?: string;
  projectId?: string;
  createdAt: string;
}

interface RelayStep {
  order: number;
  userId: string;
  displayName: string;
  status: string;
  consentedAt: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "待处理", color: "#FF9F0A" },
  relaying: { label: "传递中", color: "#5AC8FA" },
  fulfilled: { label: "已完成", color: "#30D158" },
  rejected: { label: "已拒绝", color: "#FF375F" },
  expired: { label: "已过期", color: "rgba(255,255,255,0.3)" },
};

const ROLE_LABELS: Record<string, string> = {
  info_contributor: "信息贡献",
  request_initiator: "请求发起",
  relay_intermediary: "协助转介",
  resource_provider: "资源提供",
};

export default function RequestDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all requests and find current one
  const { data: requestsData } = useQuery({
    queryKey: ["requests"],
    queryFn: () => api.get<RequestDetail[]>("/requests"),
  });

  const { data: allData } = useQuery({
    queryKey: ["demands-all"],
    queryFn: () => api.get<RequestDetail[]>("/requests/all-visible"),
  });

  const { data: stepsData, refetch: refetchSteps } = useQuery({
    queryKey: ["relay-steps", id],
    queryFn: () => api.get<RelayStep[]>(`/requests/${id}/steps`),
  });

  // Find request from either source
  const request = (requestsData?.data ?? []).find((r) => r.id === id)
    ?? (allData?.data ?? []).find((r) => r.id === id);
  const steps = stepsData?.data ?? [];
  const config = STATUS_CONFIG[request?.status ?? ""] ?? STATUS_CONFIG.expired;

  const consentMutation = useMutation({
    mutationFn: () => api.post(`/requests/${id}/consent`, {}),
    onSuccess: () => { refetchSteps(); queryClient.invalidateQueries({ queryKey: ["requests"] }); },
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.post(`/requests/${id}/reject`, {}),
    onSuccess: () => { refetchSteps(); queryClient.invalidateQueries({ queryKey: ["requests"] }); },
  });

  // Check if current user has a pending step
  const myPendingStep = steps.find((s) => s.userId === user?.id && s.status === "pending");
  const canAct = !!myPendingStep;

  if (!request) {
    return (
      <div className="glass-card text-center py-12">
        <p className="text-white/40">加载中...</p>
        <Link href="/requests" className="text-[#D4A853] text-sm mt-3 inline-block">← 返回对接请求</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl page-enter">
      {/* Header */}
      <div>
        <Link href="/requests" className="text-sm text-[#D4A853]/70 hover:text-[#D4A853] transition-colors">← 返回对接请求</Link>

        <div className="flex items-center gap-3 mt-3">
          {request.urgent && (
            <span className="flex items-center gap-1 text-[11px] text-[#FF375F] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#FF375F] animate-pulse" /> 紧急
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: config.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
            {config.label}
          </span>
          {request.timeAgo && <span className="text-[11px] text-white/25 ml-auto">{request.timeAgo}</span>}
        </div>

        <h1 className="serif text-xl font-bold text-white/95 mt-2 leading-snug">{request.title}</h1>
        <p className="text-sm text-white/40 mt-2 leading-relaxed">{request.description}</p>
      </div>

      {/* Meta info */}
      <div className="glass-card p-4 flex items-center gap-4 text-xs" style={{ marginBottom: 0 }}>
        <div className="flex items-center gap-2 text-white/50">
          <span className="w-6 h-6 rounded-full bg-[#D4A853]/15 text-[#D4A853] text-[10px] font-bold flex items-center justify-center">
            {request.initiatorId === user?.id ? "我" : (request.initiatorName ?? "?")[0]}
          </span>
          <span>{request.initiatorId === user?.id ? "我 发起" : `${request.initiatorName} 发起`}</span>
        </div>
        {request.projectName && (
          <Link
            href={`/projects/${request.projectId}`}
            className="flex items-center gap-1.5 text-white/35 ml-auto hover:text-white/60 transition-colors"
          >
            <span className="text-white/20">关联</span>
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/[0.08] text-white/50 text-[10px] truncate max-w-[160px]">
              {request.projectName}
            </span>
          </Link>
        )}
      </div>

      {/* Relay Chain Timeline */}
      {steps.length > 0 && (
        <div className="glass-card p-5" style={{ marginBottom: 0 }}>
          <div className="text-sm font-semibold text-white/80 mb-5">🔗 对接链路</div>

          {/* Mini chain preview */}
          <div className="flex items-center gap-1 mb-5 pb-5 border-b border-white/[0.06]">
            {/* Initiator node */}
            <div className="w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{
                backgroundColor: `${config.color}25`,
                border: `1px solid ${config.color}`,
                color: config.color,
                boxShadow: `0 0 8px ${config.color}22`,
              }}>
              {(request.initiatorName ?? "?")[0]}
            </div>
            <div className="w-3 h-[1px]" style={{ backgroundColor: config.color }} />

            {steps.map((step, i) => (
              <div key={step.order} className="flex items-center gap-1">
                <div className="w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{
                    backgroundColor: step.status === "consented" ? `${config.color}25` : "transparent",
                    border: `1px solid ${step.status === "consented" ? config.color : "rgba(255,255,255,0.15)"}`,
                    color: step.status === "consented" ? config.color : "rgba(255,255,255,0.3)",
                    boxShadow: step.status === "consented" ? `0 0 8px ${config.color}22` : "none",
                  }}>
                  {step.status === "consented" ? "✓" : step.displayName[0]}
                </div>
                {i < steps.length - 1 && (
                  <div className="w-3 h-[1px]" style={{
                    backgroundColor: step.status === "consented" && steps[i + 1]?.status === "consented" ? config.color : "rgba(255,255,255,0.1)",
                  }} />
                )}
              </div>
            ))}
          </div>

          {/* Detailed timeline */}
          <div className="space-y-0">
            {/* Initiator */}
            <div className="flex gap-3 relative pb-6">
              <div className="absolute left-[14px] top-[30px] bottom-0 w-[1.5px] bg-gradient-to-b from-[#D4A853]/40 to-white/5" />
              <div className="w-[30px] h-[30px] rounded-full shrink-0 bg-[#D4A853]/25 border-[1.5px] border-[#D4A853] flex items-center justify-center text-xs text-white font-bold"
                style={{ boxShadow: "0 0 14px rgba(212,168,83,0.3)" }}>
                ✓
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/90 font-semibold">{request.initiatorName}</span>
                  <span className="text-[10px] text-white/25">{request.createdAt ? new Date(request.createdAt).toLocaleDateString("zh-CN") : ""}</span>
                </div>
                <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-md bg-[#D4A853]/10 text-[#D4A853] border border-[#D4A853]/20">
                  发起人
                </span>
              </div>
            </div>

            {/* Relay steps */}
            {steps.map((step, i) => {
              const isDone = step.status === "consented";
              const isRejected = step.status === "rejected";
              const isPending = step.status === "pending";
              const isLast = i === steps.length - 1;
              const stepColor = isRejected ? "#FF375F" : isDone ? config.color : "rgba(255,255,255,0.15)";

              return (
                <div key={step.order} className="flex gap-3 relative" style={{ paddingBottom: isLast ? 0 : 24 }}>
                  {!isLast && (
                    <div className="absolute left-[14px] top-[30px] bottom-0 w-[1.5px]"
                      style={{
                        background: isDone
                          ? `linear-gradient(to bottom, ${stepColor}, ${stepColor}33)`
                          : "rgba(255,255,255,0.06)",
                      }}
                    />
                  )}
                  <div className="w-[30px] h-[30px] rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: isDone ? `${stepColor}30` : "transparent",
                      border: `1.5px solid ${stepColor}`,
                      color: isDone ? "#fff" : isRejected ? "#FF375F" : "rgba(255,255,255,0.3)",
                      boxShadow: isDone ? `0 0 14px ${stepColor}33` : "none",
                    }}>
                    {isDone ? "✓" : isRejected ? "✕" : step.order}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/90 font-semibold">
                        {step.displayName}
                        {step.userId === user?.id && <span className="text-[#D4A853] ml-1">(你)</span>}
                      </span>
                      <span className="text-[10px] text-white/25">
                        {step.consentedAt ? new Date(step.consentedAt).toLocaleDateString("zh-CN") : isPending ? "待确认" : ""}
                      </span>
                    </div>
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: `${stepColor}15`,
                        color: stepColor,
                        border: `0.5px solid ${stepColor}30`,
                      }}>
                      {isLast && !isRejected ? "资源方" : "转介人"}
                      {isRejected && " (已拒绝)"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons for pending step */}
      {canAct && (
        <div className="glass-card p-5" style={{ marginBottom: 0, borderColor: "rgba(212,168,83,0.2)" }}>
          <div className="text-sm font-semibold text-[#D4A853] mb-3">⚡ 需要你的操作</div>
          <p className="text-xs text-white/40 mb-4">
            {request.initiatorName} 的对接请求已传递到你，请选择操作：
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => consentMutation.mutate()}
              disabled={consentMutation.isPending}
              className="btn-gold py-3 text-sm"
            >
              {consentMutation.isPending ? "处理中..." : "✓ 同意转介"}
            </button>
            <button
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
              className="btn-glass py-3 text-sm text-[#FF375F]"
            >
              {rejectMutation.isPending ? "处理中..." : "✕ 拒绝"}
            </button>
          </div>
        </div>
      )}

      {/* Status message for completed/rejected */}
      {request.status === "fulfilled" && (
        <div className="glass-card p-4 text-center" style={{ marginBottom: 0, borderColor: "rgba(48,209,88,0.2)" }}>
          <span className="text-sm text-[#30D158]">✓ 对接已完成，所有节点已确认</span>
        </div>
      )}
      {request.status === "rejected" && (
        <div className="glass-card p-4 text-center" style={{ marginBottom: 0, borderColor: "rgba(255,55,95,0.2)" }}>
          <span className="text-sm text-[#FF375F]">✕ 对接请求已被拒绝</span>
        </div>
      )}
    </div>
  );
}
