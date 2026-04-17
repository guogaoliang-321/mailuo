"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { PROJECT_STAGE_LABELS } from "@meridian/shared";
import { useState } from "react";

interface CircleMember {
  id: string;
  displayName: string;
  role: string;
  joinedAt: string;
}

interface ProjectItem {
  id: string;
  name: string;
  region: string;
  scale: string;
  stage: string;
  contributorName?: string;
}

interface RelItem {
  id: string;
  alias?: string;
  domainTags: string[];
  levelTags: string[];
  closeness?: number;
  visibility: string;
  ownerName?: string;
  ownerId?: string;
  _fuzzy?: boolean;
}

const STAGE_COLORS: Record<string, string> = {
  prospecting: "text-[#FF9F0A] bg-[#FF9F0A]/10",
  approved: "text-[#5AC8FA] bg-[#5AC8FA]/10",
  bidding: "text-[#FF375F] bg-[#FF375F]/10",
  announced: "text-[#BF5AF2] bg-[#BF5AF2]/10",
  in_progress: "text-[#30D158] bg-[#30D158]/10",
  completed: "text-[#30D158] bg-[#30D158]/15",
};

export default function CircleDetailPage() {
  const params = useParams();
  const circleId = params.id as string;
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [circleCode, setCircleCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  const { data: circlesData } = useQuery({
    queryKey: ["circles"],
    queryFn: () => api.get<Array<{ id: string; name: string; description: string; myRole: string }>>("/circles"),
  });

  const { data: membersData, refetch: refetchMembers } = useQuery({
    queryKey: ["circle-members", circleId],
    queryFn: () => api.get<CircleMember[]>(`/circles/${circleId}/members`),
  });

  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<ProjectItem[]>("/projects"),
  });

  const { data: relsData } = useQuery({
    queryKey: ["relationships"],
    queryFn: () => api.get<RelItem[]>("/relationships"),
  });

  const circle = (circlesData?.data ?? []).find((c) => c.id === circleId);
  const members = membersData?.data ?? [];
  const projects = projectsData?.data ?? [];
  const relationships = (relsData?.data ?? []).filter((r) => !r._fuzzy);
  const isAdmin = circle?.myRole === "admin";

  // Member colors
  const MEMBER_COLORS = ["#5AC8FA", "#30D158", "#BF5AF2", "#FF9F0A", "#FF375F", "#D4A853"];

  if (!circle) {
    return (
      <div className="glass-card text-center py-12">
        <p className="text-white/40">加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl page-enter">
      {/* Header */}
      <div>
        <Link href="/circles" className="text-sm text-[#D4A853]/70 hover:text-[#D4A853] transition-colors">← 返回圈子</Link>
        <h1 className="serif text-2xl font-bold text-white/95 mt-2">{circle.name}</h1>
        {circle.description && (
          <p className="text-sm text-white/40 mt-1">{circle.description}</p>
        )}
        <div className="flex gap-3 mt-2 text-xs text-white/30">
          <span>{members.length} 位成员</span>
          <span>{isAdmin ? "你是管理员" : "成员"}</span>
        </div>
      </div>

      {/* Invite Code (admin only) */}
      {isAdmin && (
        <div className="glass-card p-5" style={{ marginBottom: 0, borderColor: "rgba(212,168,83,0.2)" }}>
          <div className="text-sm font-semibold text-[#D4A853] mb-3">🔗 邀请码</div>
          <p className="text-xs text-white/35 mb-3">生成邀请码分享给朋友，对方在「我的圈子」页面输入即可加入</p>
          {circleCode ? (
            <div className="flex items-center gap-3">
              <code className="flex-1 text-center py-3 rounded-xl bg-[#D4A853]/10 text-[#D4A853] text-lg font-mono font-bold tracking-widest border border-[#D4A853]/20">
                {circleCode}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(circleCode);
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2000);
                }}
                className="btn-glass text-xs px-4 py-3"
              >
                {codeCopied ? "已复制 ✓" : "复制"}
              </button>
            </div>
          ) : (
            <button
              onClick={async () => {
                setGeneratingCode(true);
                const res = await api.post<{ code?: string }>(`/circles/${circleId}/invite-code`, {});
                setGeneratingCode(false);
                if (res.success && res.data) {
                  setCircleCode((res.data as { code: string }).code);
                }
              }}
              disabled={generatingCode}
              className="btn-gold text-sm w-full py-2.5"
            >
              {generatingCode ? "生成中..." : "生成邀请码"}
            </button>
          )}
        </div>
      )}

      {/* Members */}
      <div className="glass-card p-5" style={{ marginBottom: 0 }}>
        <div className="text-sm font-semibold text-white/80 mb-4">👥 圈内成员</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {members.map((m, i) => (
            <div key={m.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03]">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  backgroundColor: `${MEMBER_COLORS[i % MEMBER_COLORS.length]}20`,
                  color: MEMBER_COLORS[i % MEMBER_COLORS.length],
                }}
              >
                {m.displayName[0]}
              </div>
              <div className="min-w-0">
                <div className="text-xs text-white/80 font-medium truncate">{m.displayName}</div>
                <div className="text-[10px] text-white/30">
                  {m.role === "admin" ? "管理员" : "成员"}
                  {m.id === user?.id && " (你)"}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Invite (admin only) */}
        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <div className="text-xs text-white/40 mb-2">邀请新成员（输入用户 ID）</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="用户 ID"
                className="input-dark flex-1 text-xs py-2"
              />
              <button
                className="btn-gold text-xs px-4 py-2"
                onClick={async () => {
                  if (!inviteEmail.trim()) return;
                  const res = await api.post(`/circles/${circleId}/invite`, { userId: inviteEmail.trim() });
                  setInviteMsg(res.success ? "已邀请" : (res.error ?? "失败"));
                  if (res.success) { setInviteEmail(""); refetchMembers(); }
                  setTimeout(() => setInviteMsg(""), 3000);
                }}
              >
                邀请
              </button>
            </div>
            {inviteMsg && <div className="text-xs text-[#D4A853] mt-2">{inviteMsg}</div>}
          </div>
        )}
      </div>

      {/* Circle Projects */}
      <div className="glass-card p-5" style={{ marginBottom: 0 }}>
        <div className="text-sm font-semibold text-white/80 mb-3">📋 圈内项目</div>
        {projects.length > 0 ? (
          <div className="space-y-2">
            {projects.slice(0, 6).map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group">
                <div className="min-w-0">
                  <div className="text-sm text-white/80 font-medium group-hover:text-white transition-colors truncate">{p.name}</div>
                  <div className="text-[11px] text-white/30 mt-0.5">{p.region} · {p.scale}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-3 ${STAGE_COLORS[p.stage] ?? ""}`}>
                  {PROJECT_STAGE_LABELS[p.stage] ?? p.stage}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-white/20 text-sm">暂无圈内项目</div>
        )}
      </div>

      {/* Circle Relationships */}
      <div className="glass-card p-5" style={{ marginBottom: 0 }}>
        <div className="text-sm font-semibold text-white/80 mb-3">🤝 圈内关系资源</div>
        {relationships.length > 0 ? (
          <div className="space-y-2">
            {relationships.slice(0, 6).map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                <div className="w-8 h-8 rounded-full bg-[#BF5AF2]/15 text-[#BF5AF2] text-xs font-bold flex items-center justify-center shrink-0">
                  {(r.alias ?? "?")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/80 font-medium truncate">{r.alias}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {r.domainTags.map((t) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[#5AC8FA]/10 text-[#5AC8FA]/80">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="text-[11px] text-white/25 shrink-0">by {r.ownerName}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-white/20 text-sm">暂无圈内关系</div>
        )}
      </div>

      {/* Circle Chat / Discussion */}
      <CircleChat circleId={circleId} />
    </div>
  );
}

function CircleChat({ circleId }: { circleId: string }) {
  const { user } = useAuth();
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["circle-messages", circleId],
    queryFn: () => api.get<Array<{ id: string; userName: string; userId: string; content: string; created_at: string }>>(`/circles/${circleId}/messages`),
    refetchInterval: 10000, // Auto refresh every 10s
  });

  const messages = [...(data?.data ?? [])].reverse(); // Show oldest first

  const handleSend = async () => {
    if (!msg.trim()) return;
    setSending(true);
    await api.post(`/circles/${circleId}/messages`, { content: msg.trim() });
    setSending(false);
    setMsg("");
    queryClient.invalidateQueries({ queryKey: ["circle-messages", circleId] });
  };

  const COLORS = ["#D4A853", "#5AC8FA", "#30D158", "#BF5AF2", "#FF9F0A", "#FF375F"];

  return (
    <div className="glass-card p-5" style={{ marginBottom: 0 }}>
      <div className="text-sm font-semibold text-white/80 mb-4">💬 圈内讨论</div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto mb-4" style={{ scrollbarWidth: "thin" }}>
        {messages.length === 0 ? (
          <div className="text-center py-8 text-white/20 text-sm">还没有消息，说点什么吧</div>
        ) : (
          messages.map((m, i) => {
            const isMe = m.userId === user?.id;
            const color = COLORS[m.userName?.charCodeAt(0) % COLORS.length] ?? COLORS[0];
            return (
              <div key={m.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className="w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${color}20`, color }}>
                  {m.userName?.[0] ?? "?"}
                </div>
                <div className={`max-w-[75%] ${isMe ? "text-right" : ""}`}>
                  <div className="text-[10px] text-white/30 mb-1">
                    {m.userName} · {m.created_at ? new Date(m.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : ""}
                  </div>
                  <div className={`inline-block px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? "bg-[#D4A853]/20 text-white/90 rounded-tr-md"
                      : "bg-white/[0.06] text-white/70 rounded-tl-md"
                  }`}>
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="发消息..."
          className="input-dark flex-1 text-sm py-2.5"
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button onClick={handleSend} disabled={sending || !msg.trim()} className="btn-gold text-xs px-5 py-2.5">
          {sending ? "..." : "发送"}
        </button>
      </div>
    </div>
  );
}
