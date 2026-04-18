"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

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
  relaying: { label: "有人响应", color: "#5AC8FA" },
  fulfilled: { label: "已完成", color: "#30D158" },
  rejected: { label: "已关闭", color: "#FF375F" },
};

export default function RequestDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: requestsData } = useQuery({
    queryKey: ["requests"],
    queryFn: () => api.get<RequestDetail[]>("/requests"),
  });

  const { data: allData } = useQuery({
    queryKey: ["demands-all"],
    queryFn: () => api.get<RequestDetail[]>("/requests/all-visible"),
  });

  const { data: responsesData, refetch: refetchResponses } = useQuery({
    queryKey: ["request-responses", id],
    queryFn: () => api.get<ResponseItem[]>(`/requests/${id}/responses`),
  });

  const request = (requestsData?.data ?? []).find((r) => r.id === id)
    ?? (allData?.data ?? []).find((r) => r.id === id);
  const responses = responsesData?.data ?? [];
  const config = STATUS_CONFIG[request?.status ?? ""] ?? STATUS_CONFIG.pending;
  const isInitiator = request?.initiatorId === user?.id;
  const hasResponded = responses.some((r) => r.userId === user?.id);

  const [responseMsg, setResponseMsg] = useState("");
  const [responding, setResponding] = useState(false);

  const completeMutation = useMutation({
    mutationFn: () => api.post(`/requests/${id}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["demands-all"] });
    },
  });

  const handleRespond = async (type: string) => {
    if (!responseMsg.trim()) return;
    setResponding(true);
    await api.post(`/requests/${id}/respond`, { type, message: responseMsg.trim() });
    setResponding(false);
    setResponseMsg("");
    refetchResponses();
  };

  const handleAccept = async (responseId: string) => {
    await api.post(`/requests/${id}/accept/${responseId}`, {});
    refetchResponses();
  };

  if (!request) {
    return (
      <div className="glass-card text-center py-12">
        <p className="text-white/40">加载中...</p>
        <Link href="/requests" className="text-[#D4A853] text-sm mt-3 inline-block">← 返回对接流</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl page-enter">
      {/* Header */}
      <div>
        <Link href="/requests" className="text-sm text-[#D4A853]/70 hover:text-[#D4A853] transition-colors">← 返回对接流</Link>
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
          {responses.length > 0 && (
            <span className="text-[11px] text-white/30">{responses.length} 人响应</span>
          )}
        </div>
        <h1 className="serif text-xl font-bold text-white/95 mt-2 leading-snug">{request.title}</h1>
        <p className="text-sm text-white/40 mt-2 leading-relaxed">{request.description}</p>
      </div>

      {/* Meta */}
      <div className="glass-card p-4 flex items-center gap-4 text-xs" style={{ marginBottom: 0 }}>
        <div className="flex items-center gap-2 text-white/50">
          <span className="w-6 h-6 rounded-full bg-[#D4A853]/15 text-[#D4A853] text-[10px] font-bold flex items-center justify-center">
            {isInitiator ? "我" : (request.initiatorName ?? "?")[0]}
          </span>
          <span>{isInitiator ? "我 发起" : `${request.initiatorName} 发起`}</span>
        </div>
        {request.projectName && (
          <Link href={`/projects/${request.projectId}`} className="flex items-center gap-1.5 text-white/35 ml-auto hover:text-white/60 transition-colors">
            <span className="text-white/20">关联</span>
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/[0.08] text-white/50 text-[10px] truncate max-w-[140px]">
              {request.projectName}
            </span>
          </Link>
        )}
      </div>

      {/* Responses List */}
      {responses.length > 0 && (
        <div className="glass-card p-5" style={{ marginBottom: 0 }}>
          <div className="text-sm font-semibold text-white/80 mb-4">📋 响应列表 ({responses.length})</div>
          <div className="space-y-3">
            {responses.map((resp) => (
              <div key={resp.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center"
                      style={{
                        backgroundColor: resp.type === "clue" ? "rgba(90,200,250,0.15)" : "rgba(48,209,88,0.15)",
                        color: resp.type === "clue" ? "#5AC8FA" : "#30D158",
                      }}>
                      {resp.userName?.[0] ?? "?"}
                    </span>
                    <span className="text-sm text-white/80 font-medium">{resp.userName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: resp.type === "clue" ? "rgba(90,200,250,0.1)" : "rgba(48,209,88,0.1)",
                        color: resp.type === "clue" ? "#5AC8FA" : "#30D158",
                        border: `0.5px solid ${resp.type === "clue" ? "rgba(90,200,250,0.2)" : "rgba(48,209,88,0.2)"}`,
                      }}>
                      {resp.type === "clue" ? "有线索" : "帮转介"}
                    </span>
                    {resp.accepted && (
                      <span className="text-[10px] text-[#30D158] bg-[#30D158]/10 px-2 py-0.5 rounded-md">✓ 已采纳</span>
                    )}
                  </div>
                  <span className="text-[10px] text-white/20">
                    {resp.created_at ? new Date(resp.created_at).toLocaleDateString("zh-CN") : ""}
                  </span>
                </div>
                <p className="text-sm text-white/60 leading-relaxed ml-8">{resp.message}</p>
                {/* Initiator can accept */}
                {isInitiator && !resp.accepted && request.status !== "fulfilled" && (
                  <div className="ml-8 mt-2">
                    <button
                      onClick={() => handleAccept(resp.id)}
                      className="text-[11px] text-[#D4A853] hover:text-[#D4A853]/80 transition-colors"
                    >
                      采纳此响应 →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Respond area — for non-initiators, not yet responded, request not completed */}
      {!isInitiator && !hasResponded && request.status !== "fulfilled" && (
        <div className="glass-card p-5" style={{ marginBottom: 0, borderColor: "rgba(212,168,83,0.15)" }}>
          <div className="text-sm font-semibold text-white/80 mb-3">💡 我可以帮忙</div>
          <textarea
            value={responseMsg}
            onChange={(e) => setResponseMsg(e.target.value)}
            placeholder="描述你的线索或可以提供的帮助..."
            rows={3}
            className="input-dark resize-none w-full mb-3"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <button
                onClick={() => handleRespond("clue")}
                disabled={responding || !responseMsg.trim()}
                className="btn-gold py-3 text-sm w-full"
              >
                {responding ? "提交中..." : "💬 我有线索"}
              </button>
              <p className="text-[10px] text-white/25 mt-1.5 text-center leading-snug">
                我知道相关信息或认识可能帮上忙的人
              </p>
            </div>
            <div>
              <button
                onClick={() => handleRespond("relay")}
                disabled={responding || !responseMsg.trim()}
                className="btn-glass py-3 text-sm w-full"
              >
                {responding ? "提交中..." : "⇌ 帮忙转介"}
              </button>
              <p className="text-[10px] text-white/25 mt-1.5 text-center leading-snug">
                我可以帮忙牵线搭桥、引荐对接
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Already responded notice */}
      {!isInitiator && hasResponded && request.status !== "fulfilled" && (
        <div className="glass-card p-4 text-center" style={{ marginBottom: 0, borderColor: "rgba(90,200,250,0.2)" }}>
          <span className="text-sm text-[#5AC8FA]">✓ 你已响应，等待发起人处理</span>
        </div>
      )}

      {/* Complete button — only for initiator, only when there are responses */}
      {isInitiator && request.status !== "fulfilled" && responses.length > 0 && (
        <button
          onClick={() => completeMutation.mutate()}
          disabled={completeMutation.isPending}
          className="btn-gold w-full py-3.5 flex items-center justify-center gap-2"
        >
          {completeMutation.isPending ? "处理中..." : "✓ 标记为已完成（记入功劳链）"}
        </button>
      )}

      {/* Completed notice */}
      {request.status === "fulfilled" && (
        <div className="glass-card p-5 text-center" style={{ marginBottom: 0, borderColor: "rgba(48,209,88,0.2)" }}>
          <div className="text-[#30D158] text-lg mb-1">✓</div>
          <div className="text-sm text-[#30D158] font-medium">对接已完成，已记入功劳链</div>
          <div className="text-[11px] text-white/25 mt-1">仅发起人和响应者可见此记录</div>
        </div>
      )}
    </div>
  );
}
