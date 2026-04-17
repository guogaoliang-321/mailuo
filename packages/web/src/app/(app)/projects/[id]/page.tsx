"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { PROJECT_STAGE_LABELS, CLOSENESS_LABELS } from "@meridian/shared";

interface ProjectDetail {
  id: string;
  name: string;
  region: string;
  scale: string;
  stage: string;
  notes: string;
  decisionMakerClue?: string;
  contributorName: string;
  contributorId: string;
  createdAt: string;
}

interface MeritEvent {
  id: string;
  action: string;
  role: string;
  userName: string;
  timestamp: string;
}

interface MatchedRelationship {
  id: string;
  alias?: string;
  domainTags: string[];
  levelTags: string[];
  closeness?: number;
  ownerName: string;
  matchScore: number;
}

const STAGE_COLORS: Record<string, string> = {
  prospecting: "text-[#FF9F0A] bg-[#FF9F0A]/10 border-[#FF9F0A]/20",
  approved: "text-[#5AC8FA] bg-[#5AC8FA]/10 border-[#5AC8FA]/20",
  bidding: "text-[#FF375F] bg-[#FF375F]/10 border-[#FF375F]/20",
  announced: "text-[#BF5AF2] bg-[#BF5AF2]/10 border-[#BF5AF2]/20",
  in_progress: "text-[#30D158] bg-[#30D158]/10 border-[#30D158]/20",
  completed: "text-[#30D158] bg-[#30D158]/15 border-[#30D158]/30",
};

const ROLE_LABELS: Record<string, string> = {
  info_contributor: "信息贡献",
  request_initiator: "请求发起",
  relay_intermediary: "协助转介",
  resource_provider: "资源提供",
};

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();

  const { data: projectData, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api.get<ProjectDetail>(`/projects/${id}`),
  });

  const { data: meritData } = useQuery({
    queryKey: ["merit", id],
    queryFn: () => api.get<{ chain: MeritEvent[]; verified: boolean }>(`/merit/project/${id}`),
    enabled: !!projectData?.data,
  });

  const { data: matchData } = useQuery({
    queryKey: ["project-matches", id],
    queryFn: () => api.get<MatchedRelationship[]>(`/recommendations/project/${id}/matches`),
    enabled: !!projectData?.data,
  });

  const project = projectData?.data;
  const meritChain = meritData?.data?.chain ?? [];
  const matches = matchData?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="skeleton-dark h-8 w-48" />
        <div className="skeleton-dark h-64" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="glass-card text-center py-12">
        <p className="text-white/40">项目不存在</p>
        <Link href="/projects" className="text-[#D4A853] text-sm mt-2 inline-block">← 返回项目池</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl page-enter">
      {/* Back + Header */}
      <div>
        <Link href="/projects" className="text-sm text-[#D4A853]/70 hover:text-[#D4A853] transition-colors">← 返回项目池</Link>
        <div className="flex items-center gap-3 mt-2">
          <span className={`text-[11px] px-3 py-1 rounded-full font-medium border ${STAGE_COLORS[project.stage] ?? ""}`}>
            {PROJECT_STAGE_LABELS[project.stage] ?? project.stage}
          </span>
          <span className="text-[10px] text-white/20 tracking-[1.5px] font-mono">{project.id.slice(0, 10).toUpperCase()}</span>
        </div>
        <h1 className="serif text-2xl font-bold text-white/95 mt-2 leading-snug">{project.name}</h1>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: "📍", label: "区域", value: project.region },
          { icon: "💰", label: "规模", value: project.scale },
          { icon: "👤", label: "贡献者", value: project.contributorName },
          { icon: "🕐", label: "时间", value: project.createdAt ? new Date(project.createdAt).toLocaleDateString("zh-CN") : "-" },
        ].map((item) => (
          <div key={item.label} className="glass-card p-4" style={{ marginBottom: 0 }}>
            <div className="text-xl mb-2">{item.icon}</div>
            <div className="text-[11px] text-white/30">{item.label}</div>
            <div className="text-[15px] text-white/90 font-semibold mt-1">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Notes */}
      {project.notes && (
        <div className="glass-card p-4" style={{ marginBottom: 0, borderColor: "rgba(212,168,83,0.15)" }}>
          <div className="text-xs text-[#D4A853] font-semibold mb-2">核心备注</div>
          <div className="text-sm text-white/70 leading-relaxed">{project.notes}</div>
        </div>
      )}

      {/* Decision Maker Clue */}
      {project.decisionMakerClue && (
        <div className="glass-card p-4" style={{ marginBottom: 0, borderColor: "rgba(255,55,95,0.15)" }}>
          <div className="text-xs text-[#FF375F] font-semibold mb-2">🔒 甲方/决策方线索（加密）</div>
          <div className="text-sm text-white/70">{project.decisionMakerClue}</div>
        </div>
      )}

      {/* Merit Chain */}
      {meritChain.length > 0 && (
        <div className="glass-card p-5" style={{ marginBottom: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-white/80">📊 功劳链</div>
            <Link href={`/projects/${id}/merit`} className="text-xs text-[#D4A853]/60 hover:text-[#D4A853] transition-colors">
              查看完整 →
            </Link>
          </div>
          <div className="space-y-0">
            {meritChain.map((event, i) => (
              <div key={event.id} className="flex gap-3 relative" style={{ paddingBottom: i < meritChain.length - 1 ? 24 : 0 }}>
                {i < meritChain.length - 1 && (
                  <div className="absolute left-[14px] top-[30px] bottom-0 w-[1.5px] bg-gradient-to-b from-[#D4A853]/40 to-[#D4A853]/10" />
                )}
                <div className="w-[30px] h-[30px] rounded-full shrink-0 bg-[#D4A853]/20 border border-[#D4A853]/40 flex items-center justify-center text-xs text-[#D4A853] font-bold">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/80 font-medium">{event.userName}</span>
                    <span className="text-[10px] text-white/25">{new Date(event.timestamp).toLocaleDateString("zh-CN")}</span>
                  </div>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-md bg-[#D4A853]/10 text-[#D4A853] border border-[#D4A853]/20">
                    {ROLE_LABELS[event.role] ?? event.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matched Resources */}
      {matches.length > 0 && (
        <div className="glass-card p-5" style={{ marginBottom: 0 }}>
          <div className="text-sm font-semibold text-white/80 mb-3">✨ 推荐匹配资源</div>
          <div className="space-y-2">
            {matches.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="w-9 h-9 rounded-full bg-[#5AC8FA]/15 text-[#5AC8FA] text-xs font-bold flex items-center justify-center shrink-0">
                  {(m.alias ?? "?")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/80 font-medium">{m.alias ?? "匿名资源"}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {m.domainTags.map((t) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[#5AC8FA]/10 text-[#5AC8FA]/80">{t}</span>
                    ))}
                  </div>
                </div>
                <Link href={`/requests/new?projectId=${id}`} className="btn-glass text-xs px-3 py-2 rounded-xl">
                  对接
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <CommentsSection entityType="project" entityId={id} />

      {/* Action Button */}
      <Link href={`/requests/new?projectId=${id}`} className="btn-gold w-full py-3.5 flex items-center justify-center gap-2 text-center">
        ⇌ 发起资源对接
      </Link>
    </div>
  );
}

function CommentsSection({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["comments", entityType, entityId],
    queryFn: () => api.get<Array<{ id: string; userName: string; userId: string; content: string; created_at: string }>>(`/${entityType}s/${entityId}/comments`),
  });

  const comments = data?.data ?? [];

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    await api.post(`/${entityType}s/${entityId}/comments`, { content: content.trim() });
    setPosting(false);
    setContent("");
    queryClient.invalidateQueries({ queryKey: ["comments", entityType, entityId] });
  };

  return (
    <div className="glass-card p-5" style={{ marginBottom: 0 }}>
      <div className="text-sm font-semibold text-white/80 mb-4">💬 评论 ({comments.length})</div>

      {comments.length > 0 && (
        <div className="space-y-3 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-[#5AC8FA]/15 text-[#5AC8FA] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {c.userName?.[0] ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-white/70 font-medium">{c.userName}</span>
                  <span className="text-white/20">{c.created_at ? new Date(c.created_at).toLocaleDateString("zh-CN") : ""}</span>
                </div>
                <p className="text-sm text-white/60 mt-1 leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写评论..."
          className="input-dark flex-1 text-sm py-2"
          onKeyDown={(e) => e.key === "Enter" && handlePost()}
        />
        <button onClick={handlePost} disabled={posting || !content.trim()} className="btn-gold text-xs px-4 py-2">
          {posting ? "..." : "发送"}
        </button>
      </div>
    </div>
  );
}
